import dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 8080,
  // ALLOWED_ORIGIN: "https://webrtc-video-calling-demo.vercel.app",
  ALLOWED_ORIGIN: "*",
  METERED_API_KEY: process.env.METERED_API_KEY || "",
  TURN_API_URL: "https://webrtc-turn-server.metered.live/api/v1/turn/credentials",
};
