// models/Project.js - COMPLETE MODEL
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  projectName: { 
    type: String, 
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [3, 'Project name must be at least 3 characters'],
    maxlength: [100, 'Project name must not exceed 100 characters']
  },
  description: { 
    type: String, 
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description must not exceed 1000 characters']
  },
  stack: { 
    type: String, 
    default: "MERN",
    enum: {
      values: ['MERN', 'MEAN', 'MEVN'],
      message: '{VALUE} is not a valid stack'
    }
  },
  questions: { 
    type: Array, 
    default: [] 
  },
  answers: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  theme: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  files: { 
    type: Array, 
    default: [] 
  },
  status: {
    type: String,
    enum: ['created', 'questions_generated', 'completed', 'failed'],
    default: 'created',
    index: true
  },
  completedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
projectSchema.index({ createdAt: -1 });
projectSchema.index({ projectName: 1 });
projectSchema.index({ status: 1, createdAt: -1 });

// Virtual for project age
projectSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / 1000 / 60);
});

const Project = mongoose.model("Project", projectSchema);

export default Project;