import { WebSocketServer, WebSocket, RawData } from "ws";
import { randomUUID } from "crypto";

const PORT = 8080;

interface WSmessage {
    type: 'join' | 'offer' | 'answer' | 'iceCandidate';
    candidate?: RTCIceCandidateInit;
    sdp?: string;
    from?: string;
    to?: string;
};

const wss = new WebSocketServer({
    port: PORT,
});

console.log(`WebSocket signaling server running on port ${PORT}`);

const clients = new Map<string, WebSocket>(); // Map of client IDs to WebSocket connections

// helper function to send data to a specific client
const sendToClient = (targetId: string, data: any) => {
    const target = clients.get(targetId);
    if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify(data));
    }
};

wss.on('connection', (ws: WebSocket) => {
    const userID = randomUUID();
    clients.set(userID, ws);
    ws.send(JSON.stringify({ type: "joined", id: userID }));

    ws.on("message", (raw: RawData) => {
        const message: WSmessage = JSON.parse(raw.toString());

        switch (message.type) {
            case "offer":
            case "answer":
            case "iceCandidate":
                if (message.to) {
                    sendToClient(message.to, { ...message, from: userID });
                }
                break;
            default:
                console.warn("Unknown message type:", message.type);
        }

    });

    ws.on("close", () => {
        if (userID) {
            clients.delete(userID);
            console.log(`Client disconnected: ${userID}`);

        }
    });

    ws.on("error", (err) => {
        console.log(`WebSocket error for client ${userID}:`, err);

    });

});
