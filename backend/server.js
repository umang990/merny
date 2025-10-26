// server.js - FIXED MIDDLEWARE ORDER
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

dotenv.config();

// Environment variable validation
const requiredEnvVars = ['MONGO_URI', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error(`❌ FATAL ERROR: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.error(`\nPlease create a .env file with the following variables:`);
  console.error(`MONGO_URI=your_mongodb_connection_string`);
  console.error(`GEMINI_API_KEY=your_gemini_api_key`);
  console.error(`CLIENT_URL=http://localhost:5173`);
  console.error(`PORT=5000`);
  process.exit(1);
}

import projectRoutes from "./routes/projectRoutes.js";

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for SSE
  crossOriginEmbedderPolicy: false
}));

// CORS configuration for SSE
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection']
}));

// CRITICAL: Body parser MUST come BEFORE rate limiters
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Rate limiting - NOW body is available
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit AI calls to 20 per hour
  message: 'Too many AI requests, please try again later.',
  skip: (req) => {
    // Now req.body is available because body parser ran first
    return req.body?.cached === true;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all routes
app.use(generalLimiter);

// Routes
app.use("/api/project", aiLimiter, projectRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: {
      nodeVersion: process.version,
      mongoConnected: mongoose.connection.readyState === 1
    }
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "MERNY AI Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      project: "/api/project/*"
    },
    streaming: "enabled"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  
  // Don't send response if headers already sent (for streaming)
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// MongoDB connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ MongoDB connected successfully");
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) {
        console.error("❌ Could not connect to MongoDB after multiple attempts");
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

connectDB();

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ===================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API: http://localhost:${PORT}/api/project`);
  console.log(`🧪 Test Gemini: http://localhost:${PORT}/api/project/test-gemini`);
  console.log(`🌊 Streaming endpoints available!`);
  console.log(`🔒 Security enabled (Helmet + CORS + Rate Limiting)`);
  console.log('🚀 ===================================');
  console.log('');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

export default app;