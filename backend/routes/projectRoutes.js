// routes/projectRoutes.js - COMPLETE ROUTES
import express from "express";
import { 
  startProject, 
  getQuestions,
  getQuestionsStream,
  finalBuild,
  finalBuildStream
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/start", startProject);
router.post("/questions", getQuestions);
router.post("/questions-stream", getQuestionsStream);
router.post("/final-build", finalBuild);
router.post("/final-build-stream", finalBuildStream);

// TEST ENDPOINT
router.get("/test-gemini", async (req, res) => {
  try {
    console.log("🧪 Testing Gemini API...");
    
    const { callGeminiAPI } = await import("../utils/geminiAPI.js");
    
    const testPrompt = `Generate a simple JSON array with 3 test questions. Each question should have: key, question, and options array.

Example format:
[
  {
    "key": "test1",
    "question": "What is your favorite color?",
    "options": ["Red", "Blue", "Green", "Yellow"]
  }
]

Return ONLY the JSON array, no markdown, no explanations.`;

    const result = await callGeminiAPI(testPrompt, { 
      temperature: 0.7,
      timeout: 30000 
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Gemini API returned null. Check API key and quota."
      });
    }

    console.log("✅ Gemini API test successful");
    
    res.json({
      success: true,
      message: "Gemini API is working!",
      result: result,
      type: Array.isArray(result) ? "array" : typeof result,
      count: Array.isArray(result) ? result.length : null
    });

  } catch (error) {
    console.error("❌ Gemini API test failed:", error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        response: error.response?.data
      }
    });
  }
});

export default router;