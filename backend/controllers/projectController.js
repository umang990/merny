// controllers/projectController.js - PRODUCTION READY WITH BETTER PARSING
import Project from "../models/Project.js";
import { callGeminiAPI, callGeminiAPIStreaming } from "../utils/geminiAPI.js";

// Helper to safely query MongoDB with timeout handling
const findProjectWithRetry = async (projectId, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      const project = await Project.findById(projectId)
        .maxTimeMS(5000)
        .lean();
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      return project;
    } catch (err) {
      console.error(`❌ Database query attempt ${i + 1} failed:`, err.message);
      
      if (i === retries - 1) {
        throw new Error(`Database timeout: ${err.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// ============================================
// STEP 1: START PROJECT
// ============================================
export const startProject = async (req, res) => {
  try {
    const { projectName, description, stack } = req.body;

    if (!projectName || !description) {
      return res.status(400).json({ 
        error: "Missing required fields: projectName and description are required" 
      });
    }

    console.log("Creating project:", { projectName, description, stack });

    const newProject = await Project.create({ 
      projectName, 
      description, 
      stack: stack || "MERN"
    });

    console.log("✅ Project created:", newProject._id);

    res.status(201).json({
      success: true,
      project: newProject
    });
  } catch (err) {
    console.error("❌ Error in startProject:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Internal server error"
    });
  }
};

// ============================================
// STEP 2: GET QUESTIONS (NON-STREAMING)
// ============================================
export const getQuestions = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    console.log("📋 Fetching questions for project:", projectId);

    const project = await findProjectWithRetry(projectId);

    if (project.questions && project.questions.length > 0) {
      console.log("✅ Returning cached questions:", project.questions.length);
      return res.json({ 
        success: true,
        questions: project.questions,
        count: project.questions.length,
        cached: true
      });
    }

    const prompt = generateQuestionsPrompt(project);
    console.log("🤖 Calling Gemini API for questions...");

    const questions = await callGeminiAPI(prompt, { 
      temperature: 0.8,
      timeout: 90000,
      maxRetries: 2
    });

    if (!questions || !Array.isArray(questions)) {
      console.error("❌ Invalid response from Gemini");
      return res.status(500).json({ 
        error: "Failed to generate questions. Please try again." 
      });
    }

    console.log("✅ Received questions:", questions.length);

    const validQuestions = questions.filter(q => 
      q.key && q.question && Array.isArray(q.options) && q.options.length >= 2
    );

    console.log("✅ Valid questions:", validQuestions.length);

    if (validQuestions.length === 0) {
      return res.status(500).json({ 
        error: "No valid questions generated. Please try again." 
      });
    }

    try {
      await Project.findByIdAndUpdate(
        projectId,
        { 
          questions: validQuestions,
          status: 'questions_generated'
        },
        { new: true, maxTimeMS: 5000 }
      );
      console.log("✅ Questions saved to database");
    } catch (saveErr) {
      console.error("⚠️ Failed to save questions:", saveErr.message);
    }

    res.json({ 
      success: true,
      questions: validQuestions,
      count: validQuestions.length
    });

  } catch (err) {
    console.error("❌ Error in getQuestions:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ============================================
// STEP 2B: GET QUESTIONS STREAMING
// ============================================
export const getQuestionsStream = async (req, res) => {
  console.log("🌊 getQuestionsStream called");
  
  try {
    const { projectId } = req.body;

    if (!projectId) {
      console.error("❌ No projectId provided");
      return res.status(400).json({ error: "projectId is required" });
    }

    console.log("📋 Streaming questions for project:", projectId);

    let project;
    try {
      project = await findProjectWithRetry(projectId);
      console.log("✅ Project found:", project.projectName);
    } catch (dbErr) {
      console.error("❌ Database error:", dbErr.message);
      return res.status(500).json({ 
        error: "Database connection issue. Please try again.",
        details: dbErr.message 
      });
    }

    if (project.questions && project.questions.length > 0) {
      console.log("✅ Returning cached questions");
      return res.json({ 
        success: true,
        questions: project.questions,
        count: project.questions.length,
        cached: true
      });
    }

    console.log("📡 Setting SSE headers...");
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    try {
      res.flushHeaders();
      console.log("✅ SSE headers sent");
    } catch (flushErr) {
      console.error("❌ Failed to flush headers:", flushErr.message);
      return res.status(500).json({ error: "Failed to start stream" });
    }

    const prompt = generateQuestionsPrompt(project);
    console.log("🤖 Starting Gemini streaming...");

    let questionCount = 0;
    let accumulatedText = '';

    try {
      const questions = await callGeminiAPIStreaming(prompt, async (chunk) => {
        try {
          if (!res.writableEnded) {
            // FIXED: Simulate smooth streaming with smaller chunks and delays
            const CHUNK_SIZE = 30; // Small chunks for smooth animation
            const DELAY_MS = 20; // Delay between chunks for visual effect
            
            for (let i = 0; i < chunk.length; i += CHUNK_SIZE) {
              const miniChunk = chunk.substring(i, i + CHUNK_SIZE);
              res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: miniChunk })}\n\n`);
              
              // Add small delay for animation effect
              if (i + CHUNK_SIZE < chunk.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
              }
            }
            
            accumulatedText += chunk;
            
            const matches = accumulatedText.match(/\{[^{}]*"key"[^{}]*"question"[^{}]*\}/g);
            if (matches) {
              const newCount = matches.length;
              if (newCount > questionCount) {
                questionCount = newCount;
                res.write(`data: ${JSON.stringify({ type: 'progress', count: questionCount })}\n\n`);
              }
            }
          }
        } catch (writeErr) {
          console.error('❌ Write error:', writeErr.message);
        }
      }, { temperature: 0.8 });

      console.log("✅ Streaming complete, got questions:", Array.isArray(questions) ? questions.length : 'invalid');

      // Handle both array and string responses
      let validQuestions = [];
      
      if (Array.isArray(questions)) {
        validQuestions = questions.filter(q => 
          q.key && q.question && Array.isArray(q.options)
        );
      } else if (typeof questions === 'string') {
        console.warn("⚠️ Received string instead of array, this shouldn't happen");
        throw new Error("Invalid response format from AI");
      }

      if (validQuestions.length === 0) {
        throw new Error("No valid questions received from streaming");
      }

      console.log("✅ Valid questions:", validQuestions.length);

      // Save to database asynchronously
      Project.findByIdAndUpdate(
        projectId, 
        { 
          questions: validQuestions,
          status: 'questions_generated'
        },
        { maxTimeMS: 5000 }
      ).catch(err => console.error("⚠️ Save error:", err.message));

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          questions: validQuestions,
          count: validQuestions.length 
        })}\n\n`);
        res.end();
      }

    } catch (streamErr) {
      console.error("❌ Streaming error:", streamErr);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
        res.end();
      }
    }

  } catch (err) {
    console.error("❌ Fatal error in getQuestionsStream:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

// ============================================
// STEP 3: FINAL BUILD (NON-STREAMING)
// ============================================
export const finalBuild = async (req, res) => {
  try {
    const { projectId, answers, theme } = req.body;

    if (!projectId || !answers || !theme) {
      return res.status(400).json({ 
        error: "Missing required fields" 
      });
    }

    console.log("🏗️ Building project:", projectId);

    const project = await findProjectWithRetry(projectId);

    if (project.files && project.files.length > 0) {
      console.log("✅ Returning cached files:", project.files.length);
      return res.json({ 
        success: true,
        files: project.files,
        count: project.files.length,
        cached: true
      });
    }

    const prompt = generateFilesPrompt(project, answers, theme);
    console.log("🤖 Calling Gemini API for files...");

    const files = await callGeminiAPI(prompt, { 
      temperature: 0.5,
      timeout: 150000,
      maxRetries: 2
    });

    if (!files || !Array.isArray(files)) {
      console.error("❌ Invalid response from Gemini");
      return res.status(500).json({ 
        error: "Failed to generate files. Please try again." 
      });
    }

    console.log("✅ Received files:", files.length);

    const validFiles = files.filter(f => 
      f.filename && typeof f.filename === 'string' &&
      f.content && typeof f.content === 'string'
    );

    console.log("✅ Valid files:", validFiles.length);

    if (validFiles.length < 3) {
      console.error("❌ Too few files:", validFiles.length);
      return res.status(500).json({ 
        error: `Only ${validFiles.length} files generated. Please try again.` 
      });
    }

    try {
      await Project.findByIdAndUpdate(
        projectId,
        { 
          answers,
          theme,
          files: validFiles,
          status: 'completed',
          completedAt: new Date()
        },
        { new: true, maxTimeMS: 5000 }
      );
      console.log("✅ Files saved to database");
    } catch (saveErr) {
      console.error("⚠️ Failed to save files:", saveErr.message);
    }

    console.log("🎉 Build complete!");

    res.json({ 
      success: true,
      files: validFiles,
      count: validFiles.length
    });

  } catch (err) {
    console.error("❌ Error in finalBuild:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "An error occurred"
    });
  }
};

// ============================================
// STEP 3B: FINAL BUILD STREAMING - FIXED
// ============================================
export const finalBuildStream = async (req, res) => {
  console.log("🌊 finalBuildStream called");
  
  try {
    const { projectId, answers, theme } = req.body;

    if (!projectId || !answers || !theme) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("🏗️ Streaming build for project:", projectId);

    const project = await findProjectWithRetry(projectId);

    if (project.files && project.files.length > 0) {
      console.log("✅ Returning cached files");
      return res.json({ 
        success: true,
        files: project.files,
        count: project.files.length,
        cached: true
      });
    }

    console.log("📡 Setting SSE headers...");
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    console.log("✅ SSE headers sent");

    const prompt = generateFilesPrompt(project, answers, theme);
    console.log("🤖 Starting Gemini streaming for files...");

    let fileCount = 0;
    let accumulatedText = '';

    try {
      const files = await callGeminiAPIStreaming(prompt, (chunk) => {
        try {
          if (!res.writableEnded) {
            // FIXED: Split chunk into smaller pieces for animation
            const CHUNK_SIZE = 80; // Characters per visual chunk (larger for files)
            for (let i = 0; i < chunk.length; i += CHUNK_SIZE) {
              const miniChunk = chunk.substring(i, i + CHUNK_SIZE);
              res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: miniChunk })}\n\n`);
            }
            
            accumulatedText += chunk;
            
            const filenameMatches = accumulatedText.match(/"filename"\s*:\s*"([^"]+)"/g);
            if (filenameMatches) {
              const newCount = filenameMatches.length;
              if (newCount > fileCount) {
                fileCount = newCount;
                const latestMatch = filenameMatches[filenameMatches.length - 1];
                const filename = latestMatch.match(/"filename"\s*:\s*"([^"]+)"/)?.[1];
                
                res.write(`data: ${JSON.stringify({ 
                  type: 'file',
                  filename: filename,
                  count: fileCount
                })}\n\n`);
              }
            }
          }
        } catch (writeErr) {
          console.error('❌ Write error:', writeErr.message);
        }
      }, { temperature: 0.5 });

      console.log("✅ Streaming complete, received data type:", typeof files, "isArray:", Array.isArray(files));

      // FIXED: Handle both array and recovered objects
      let validFiles = [];
      
      if (Array.isArray(files)) {
        validFiles = files.filter(f => f.filename && f.content);
        console.log("✅ Valid files from array:", validFiles.length);
      } else if (typeof files === 'object' && files !== null) {
        // Single object or invalid structure
        console.warn("⚠️ Received object instead of array");
        throw new Error("Invalid response structure from AI");
      } else if (typeof files === 'string') {
        console.warn("⚠️ Received unparsed string, this should have been handled");
        throw new Error("Failed to parse AI response");
      }

      if (validFiles.length === 0) {
        throw new Error("No valid files received from streaming");
      }

      // Save to database asynchronously
      Project.findByIdAndUpdate(
        projectId, 
        { 
          answers,
          theme,
          files: validFiles,
          status: 'completed',
          completedAt: new Date()
        },
        { maxTimeMS: 5000 }
      ).catch(err => console.error("⚠️ Save error:", err.message));

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          files: validFiles,
          count: validFiles.length 
        })}\n\n`);
        res.end();
      }

    } catch (streamErr) {
      console.error("❌ Streaming error:", streamErr);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
        res.end();
      }
    }

  } catch (err) {
    console.error("❌ Fatal error in finalBuildStream:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateQuestionsPrompt(project) {
  return `Generate exactly 15 personalized preference questions for building a ${project.stack} project.

Project: "${project.projectName}" - ${project.description}

You are having a conversation with a user to understand their project needs. Ask questions in a friendly, conversational way using "you" and "your".

Cover these 15 areas (authentication, database, UI framework, color theme, API type, state management, forms, file uploads, real-time features, deployment, testing, error tracking, analytics, email, payments).

CRITICAL: Respond ONLY with valid JSON array. No markdown, no explanations.

Format:
[
  {
    "key": "auth_preference",
    "question": "What authentication system do you want for your app?",
    "options": ["JWT tokens", "OAuth (Google/GitHub)", "Email/Password", "No authentication"]
  }
]

Return ONLY the JSON array. START with [ and END with ].`;
}

function generateFilesPrompt(project, answers, theme) {
  return `You are an expert ${project.stack} developer. Generate a complete project structure.

Project: "${project.projectName}"
Description: "${project.description}"
Stack: ${project.stack}
User Preferences: ${JSON.stringify(answers, null, 2)}
Theme: ${JSON.stringify(theme, null, 2)}

Generate 10-15 essential files for a complete, working ${project.stack} application.

Include backend files (server.js, models, routes, package.json), frontend files (App.jsx, components, package.json), README.md, and .gitignore.

CRITICAL: Respond ONLY with valid JSON array. No markdown, no explanations. ENSURE ALL STRINGS ARE PROPERLY TERMINATED.

Format:
[
  {
    "filename": "backend/server.js",
    "content": "import express from 'express';\\nconst app = express();\\n// complete code here"
  },
  {
    "filename": "frontend/src/App.jsx",
    "content": "import React from 'react';\\nfunction App() {\\n  return <div>App</div>;\\n}\\nexport default App;"
  }
]

IMPORTANT: Make sure every string is complete and properly closed with quotes. Return ONLY the JSON array. START with [ and END with ].`;
}