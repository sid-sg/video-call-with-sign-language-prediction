import express from "express";
import { GoogleGenAI } from "@google/genai";
import dedent from "dedent";

const router = express.Router();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ""
});

// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post("/improve-text", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ error: "Missing text" });
        }

        const prompt = dedent(`
You are an AI language assistant that rewrites transcribed sign language (ASL) or rough English into natural, readable English while keeping the exact meaning.

Follow these instructions carefully:

1. Preserve the speaker’s intent, emotion, and meaning — never add or invent new details.
2. Correct grammar, punctuation, and capitalization naturally.
3. Merge repeated words or phrases that appear due to gesture emphasis (e.g., "I I go go" → "I'm going" or "I go" depending on context).
4. Add minimal punctuation to make it readable, but keep the tone conversational.
5. Keep short responses (like "hi", "yes", "thanks") simple — don’t expand them unnaturally.
6. If a token is unclear (like "UNK", "?", or random letters), ignore it gracefully instead of guessing.
7. If the input is incomplete (e.g., only a few letters), return it as-is without trying to rephrase.

Now rewrite the following ASL transcription or rough English:

INPUT:
"${text}"

OUTPUT (corrected and natural English):
`);


        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        const response = result.text;

        res.json({ improvedText: response });
    } catch (err) {
        console.error("Gemini API error:", err);
        res.status(500).json({ error: "Failed to improve text" });
    }
});

export default router;
