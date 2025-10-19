import { WebSocketServer, WebSocket, RawData } from "ws";

const PORT = 8080;

interface WSmessage {
    type: 'sender' | 'receiver' | 'createOffer' | 'createAnswer' | 'iceCandidate';
    candidate?: RTCIceCandidateInit;
    sdp?: string;
};

const wss = new WebSocketServer({ 
    port: PORT,
    // host: '0.0.0.0'  
});

console.log(`WebSocket signaling server running on port ${PORT}`);


let senderSocket: null | WebSocket = null;
let recieverSocket: null | WebSocket = null;

wss.on('connection', (ws: WebSocket) => {
    ws.on('error', console.error);

    ws.on('message', (data: RawData) => {
        const message: WSmessage = JSON.parse(data.toString());
        // console.log('Received message:', message);

        switch (message.type) {
            case 'sender':      // Store sender socket       
                senderSocket = ws;
                break;
            case 'receiver':        // Store receiver socket
                recieverSocket = ws;
                break;
            case 'createOffer':     // Forward offer SDP from sender to receiver
                if (ws !== senderSocket) {
                    console.error('Only sender can create offer');
                    return;
                }
                recieverSocket?.send(JSON.stringify({ type: 'createOffer', sdp: message.sdp }));
                break;
            case 'createAnswer':   // Forward answer SDP from receiver to sender
                if (ws !== recieverSocket) {
                    console.error('Only receiver can create answer');
                    return;
                }
                senderSocket?.send(JSON.stringify({ type: 'createAnswer', sdp: message.sdp }));
                break;
            case 'iceCandidate':  // Forward ICE candidates between sender and receiver
                if (ws == senderSocket) {
                    recieverSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
                }
                else if (ws == recieverSocket) {
                    senderSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
                }
                break;
            default:
                console.error('Unknown message type:', message.type);
                break;
        }
    });

});