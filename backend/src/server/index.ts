import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import { CONFIG } from "../config/env";
import { initSignaling } from "./signaling";
import turnRouter from "./routes/turn";
import healthRouter from "./routes/health";

const app = express();
app.use(cors({ origin: CONFIG.ALLOWED_ORIGIN }));
app.use(express.json());

// REST routes
app.use("/health", healthRouter);
app.use("/api", turnRouter);

const httpServer = createServer(app);

// Socket.IO server for signaling
const io = new Server(httpServer, {
    cors: { origin: CONFIG.ALLOWED_ORIGIN, methods: ["GET", "POST"] },
});
initSignaling(io);

httpServer.listen(CONFIG.PORT, () => {
    console.log(`Server running on port ${CONFIG.PORT}`);
});
