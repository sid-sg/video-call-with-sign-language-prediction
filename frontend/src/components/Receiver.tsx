import { useEffect, useRef, useState } from "react"

const Receiver = () => {

    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    async function startRecievingVideo(data: any) {
        if (data.type === 'createOffer') {
            const pc = new RTCPeerConnection();
            setPeerConnection(pc);

            await pc.setRemoteDescription(data.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.send(JSON.stringify({
                        type: 'iceCandidate',
                        candidate: event.candidate
                    }));
                }
            }

            pc.ontrack = (event) => {
                console.log("Track received:", event);
                if (videoRef.current) {
                    videoRef.current.srcObject = new MediaStream([event.track]);
                }
            }

            socket?.send(JSON.stringify({
                type: 'createAnswer',
                sdp: pc.localDescription
            }));
        }
        else if (data.type === 'iceCandidate') {
            peerConnection?.addIceCandidate(data.candidate);
        }
    }

    useEffect(() => {
        const sock = new WebSocket("ws://localhost:8080");
        setSocket(sock);

        sock.onopen = () => {
            sock.send(JSON.stringify({ type: 'receiver' }));
        };

        sock.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            startRecievingVideo(data);
        }

    }, []);

    return (
        <div>
            <h1>Receiver</h1>
            <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "auto" }} />
        </div>
    )
}

export default Receiver