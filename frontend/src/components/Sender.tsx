import { useEffect, useState } from "react"

const Sender = () => {

    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

    useEffect(() => {
        const sock = new WebSocket("ws://localhost:8080");

        sock.onopen = () => {
            sock.send(JSON.stringify({
                type: 'sender'
            }));
        };

        setSocket(sock);
    }, []);

    async function startSendingVideo() {
        if (!socket) {
            return;
        }

        const pc = new RTCPeerConnection();
        setPeerConnection(pc);

        pc.onnegotiationneeded = async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.send(JSON.stringify({
                type: 'createOffer',
                sdp: pc.localDescription
            }));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket?.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: event.candidate
                }));
            }
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'createAnswer') {
                pc.setRemoteDescription(data.sdp);
            }
            else if (data.type === 'iceCandidate') {
                pc.addIceCandidate(data.candidate);
            }
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        pc.addTrack(stream.getVideoTracks()[0], stream);
    }

    return (
        <div>
            <h1>Sender</h1>
            <button onClick={startSendingVideo}>Send</button>
        </div>
    )
}

export default Sender