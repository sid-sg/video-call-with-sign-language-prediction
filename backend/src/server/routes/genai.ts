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

1. **Preserve the speaker's intent, emotion, and meaning** — never add or invent new details.

2. **Handle concatenated words**: Sign language transcriptions often appear as continuous strings without spaces (e.g., "HIDAD", "HOWAREYOU", "ILOVEYOU"). Split these into separate words intelligently based on common English words and phrases.
   - Examples:
     - "HOWRYOU" → "How are you"
     - "ILUVYOU" → "I love you"
     - "THANKYOU" → "Thank you"
     - "GOODMORNING" → "Good morning"

3. **Correct grammar, punctuation, and capitalization naturally** to make the text readable.

4. **Merge repeated words or phrases** that appear due to gesture emphasis (e.g., "I I go go" → "I'm going" or "I go" depending on context).

5. **Add minimal punctuation** to make it readable, but keep the tone conversational and natural.

6. **Keep short responses simple** — don't expand simple greetings or affirmations unnaturally:
   - "HI" → "Hi"
   - "YES" → "Yes"
   - "THANKS" → "Thanks"

7. **Ignore unclear tokens gracefully**: If a token is unclear (like "UNK", "?", or random letters that don't form words), ignore it instead of guessing.

8. **Handle incomplete input**: If the input is very short or incomplete (e.g., only 1-2 random letters like "H" or "AB"), return it as-is without trying to rephrase.

9. **Recognize common ASL patterns**:
   - ASL often omits articles (a, an, the), helping verbs (is, are, am), and prepositions
   - Example: "I HUNGRY" → "I'm hungry"
   - Example: "SHE GO STORE" → "She's going to the store"

10. **Context-aware word splitting**: When splitting concatenated text, prioritize common words and phrases over uncommon interpretations.

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
