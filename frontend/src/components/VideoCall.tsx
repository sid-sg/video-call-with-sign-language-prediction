import { useEffect, useState, useRef } from "react";

export const VideoCall = () => {
    // WebSocket connection state
    const [socket, setSocket] = useState<WebSocket | null>(null);

    //Refs for displaying local and remote video streams
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // RTCPeerConnection reference
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null);


    // ---------------- Signaling Server WebSocket Setup ----------------
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');
        ws.onopen = () => console.log("Connected to signaling server");
        setSocket(ws);

        return () => ws.close();
    }, []);

    // ---------------- WebRTC Setup ----------------
    useEffect(() => {
        if (!socket) return;

        const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        const pc = new RTCPeerConnection(config);
        pcRef.current = pc;

        // On recieving a track, set it to the remote video element
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // on getting new ICE candidate, send it to the peer via signaling server
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: event.candidate,
                    from: userId,
                    to: targetId
                }));
            }
        };

        // ---------------- Signaling Message Handling ----------------

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'joined') {
                setUserId(message.id);
            }

            // If we are the callee and receive an offer → create & send back an answer
            else if (message.type === 'offer') {
                await pc.setRemoteDescription(message.sdp);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.send(JSON.stringify({
                    type: 'answer',
                    sdp: pc.localDescription,
                    from: userId,
                    to: message.from
                }));
            }

            // If we are the caller and receive an answer → set it as remote description
            else if (message.type === 'answer') {
                await pc.setRemoteDescription(message.sdp);
            }

            // If we receive a new ICE candidate → add it to our peer connection
            else if (message.type === 'iceCandidate') {
                await pc.addIceCandidate(message.candidate);
            }
        };

        // ---------------- Local Media Capturing ----------------

        const startLocalMedia = async () => {
            const localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
            }

            // add all tracks (video + audio) to the peer connection
            localStream.getTracks().forEach(
                (track) => pc.addTrack(track, localStream)
            );
        };

        startLocalMedia();

    }, [socket]);


    // ---------------- Create Offer ----------------
    const callPeer = async () => {
        if (!pcRef.current || !socket || !userId || !targetId) return;
        const pc = pcRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.send(
            JSON.stringify({
                type: "offer",
                sdp: pc.localDescription,
                from: userId,
                to: targetId,
            })
        );
    };


    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
                <div>
                    <h3>🟢 Local Video</h3>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-80 border"
                    />
                </div>
                <div>
                    <h3>🔵 Remote Video</h3>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-80 border"
                    />
                </div>
            </div>

            <div className="mt-4">
                <input
                    placeholder="Peer ID"
                    value={targetId || ""}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="border px-2 py-1 mr-2"
                />
                <button
                    onClick={callPeer}
                    disabled={!targetId}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                    Call Peer
                </button>
            </div>

            {userId && (
                <p className="text-sm text-gray-600">Your ID: <b>{userId}</b></p>
            )}
        </div>

    )
};