import { useEffect, useRef } from "react";

export const Receiver = () => {
    // Use a ref to get direct access to the <video> element
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        const pc = new RTCPeerConnection(configuration);

        socket.onopen = () => {
            console.log("Connected to signaling server.");
            socket.send(JSON.stringify({ type: 'receiver' }));
        };

        // This handler is called when a track is received from the sender
        pc.ontrack = (event) => {
            console.log("Track received:", event.track);
            if (videoRef.current) {
                // When a track arrives, create a new MediaStream, add the track,
                // and set it as the video element's source.
                const stream = new MediaStream([event.track]);
                videoRef.current.srcObject = stream;
            }
        };

        // Handle signaling messages from the server
        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'createOffer') {
                // Received an offer from the sender
                await pc.setRemoteDescription(message.sdp);

                // Create an answer, set it as the local description, and send it back
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.send(JSON.stringify({
                    type: 'createAnswer',
                    sdp: answer
                }));

            } else if (message.type === 'iceCandidate') {
                // Add the ICE candidate received from the sender
                await pc.addIceCandidate(message.candidate);
            }
        };

        // Cleanup logic to run when the component unmounts
        return () => {
            socket.close();
            pc.close();
        };

    }, []); // The empty dependency array ensures this runs only once

    return (
        <div>
            <h1>Receiver</h1>
            {/* The 'autoPlay' and 'playsInline' attributes help ensure the video
              starts playing automatically without going fullscreen.
              The 'muted' attribute is often necessary to bypass browser autoplay restrictions.
            */}
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "600px" }}></video>
        </div>
    );
};