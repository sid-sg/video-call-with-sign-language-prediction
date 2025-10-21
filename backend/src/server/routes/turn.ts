import express from "express";
import { CONFIG } from "../../config/env";

const router = express.Router();

router.get("/turn-credentials", async (_, res) => {
    try { 
        const url = `${CONFIG.TURN_API_URL}?apiKey=${CONFIG.METERED_API_KEY}`;        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch TURN credentials: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching TURN credentials:", error);
        res.status(500).json({ error: "Failed to fetch TURN credentials" });
    }
});

export default router;
