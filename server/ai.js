const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
require('dotenv').config();

// Setup Upload (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

// Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ➡️ ROUTE: GENERATE PLAN FROM TEXT (POST /ai/generate-text)
router.post('/generate-text', async (req, res) => {
    const { prompt } = req.body; // e.g. "I am 70kg, vegetarian, want to bulk."

    try {
        const aiPrompt = `
            Act as a fitness nutritionist. 
            Create a 7-day Diet Plan (Vegetarian) and Workout Plan based on this user goal: "${prompt}".
            
            IMPORTANT: You must return ONLY valid JSON. No markdown, no text.
            Structure:
            {
                "dietPlan": { "Monday": "...", "Tuesday": "..." },
                "workoutPlan": { "Monday": "...", "Tuesday": "..." },
                "targetCalories": 2400,
                "targetProtein": 100
            }
        `;

        const result = await model.generateContent(aiPrompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if Gemini adds it (```json ... ```)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonPlan = JSON.parse(text);
        res.json(jsonPlan);

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to generate plan." });
    }
});

module.exports = router;