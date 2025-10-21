import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { WSmessage } from "../types/message.js";


export function initSignaling(io: Server) {

    const clients = new Map<string, string>(); // Map of client IDs to WebSocket connections

    io.on('connection', (socket: Socket) => {
        const userID = randomUUID();
        clients.set(userID, socket.id);

        socket.emit('joined', { type: "joined", id: userID });
        console.log(`Client connected: ${userID}`);

        socket.on("message", (message: WSmessage) => {

            switch (message.type) {
                case "offer":
                case "answer":
                case "iceCandidate":
                    if (message.to) {
                        const targetSocketId = clients.get(message.to);
                        if (targetSocketId) {
                            io.to(targetSocketId).emit('message', { ...message, from: userID });
                        }
                    }
                    break;
                default:
                    console.warn("Unknown message type:", message.type);
            }

        });

        socket.on("disconnect", () => {
            if (userID) {
                clients.delete(userID);
                console.log(`Client disconnected: ${userID}`);

            }
        });

        socket.on("error", (err) => {
            console.log(`Socket error for client ${userID}:`, err);

        });

    });
}

// const httpServer = createServer();
// const io = new Server(httpServer, {
//     cors: { origin: "*", methods: ["GET", "POST"] },
// });


// httpServer.listen(PORT, () => {
//     console.log(`Socket.IO signaling server running on port ${PORT}`);
// });