import { useEffect, useState, useRef } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    // Use a ref for the video element to avoid direct DOM manipulation
    const videoRef = useRef<HTMLVideoElement>(null);

    // Establish WebSocket connection on component mount
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'sender' }));
        };
        setSocket(socket);

        // Cleanup on unmount
        return () => {
            socket.close();
        };
    }, []);

    const initiateConn = async () => {
        if (!socket) {
            alert("Socket not found");
            return;
        }

        // Create the peer connection here
        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        const pc = new RTCPeerConnection(configuration);

        // **FIX:** Define the onmessage handler *after* pc is created.
        // It now closes over the 'pc' const from this function's scope.
        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'createAnswer') {
                // Now 'pc' is not null and this will work
                await pc.setRemoteDescription(message.sdp);
            } else if (message.type === 'iceCandidate') {
                await pc.addIceCandidate(message.candidate);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: event.candidate
                }));
            }
        };

        // This will be triggered by pc.addTrack()
        pc.onnegotiationneeded = async () => {
            // console.log("onnegotiationneeded triggered");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.send(JSON.stringify({
                type: 'createOffer',
                sdp: pc.localDescription
            }));
        };

        // Get video stream and add tracks, which will trigger onnegotiationneeded
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });
    };

    return (
        <div>
            <h1>Sender</h1>
            <video ref={videoRef}  autoPlay playsInline></video>
            <br />
            <button onClick={initiateConn}>Start Sending</button>
        </div>
    );
};