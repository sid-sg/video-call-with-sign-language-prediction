import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const VideoCall = () => {
    // Socket.IO connection state
    const [socket, setSocket] = useState<Socket | null>(null);

    //Refs for displaying local and remote video streams
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // RTCPeerConnection reference
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null);


    // ---------------- Signaling Server Socket.IO Setup ----------------
    useEffect(() => {
        const socketConnection = io('http://localhost:8080',{});
        
        socketConnection.on('connect', () => {
            console.log("Connected to signaling server");
        });

        socketConnection.on('disconnect', () => {
            console.log("Disconnected from signaling server");
        });

        setSocket(socketConnection);

        return () => {
            socketConnection.close();
        };
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
                socket.emit('message', {
                    type: 'iceCandidate',
                    candidate: event.candidate,
                    from: userId,
                    to: targetId
                });
            }
        };

        // ---------------- Signaling Message Handling ----------------

        socket.on('joined', (message) => {
            setUserId(message.id);
            console.log('Received user ID:', message.id);
        });

        socket.on('message', async (message) => {
            // If we are the callee and receive an offer → create & send back an answer
            if (message.type === 'offer') {
                await pc.setRemoteDescription(message.sdp);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('message', {
                    type: 'answer',
                    sdp: pc.localDescription,
                    from: userId,
                    to: message.from
                });
            }

            // If we are the caller and receive an answer → set it as remote description
            else if (message.type === 'answer') {
                await pc.setRemoteDescription(message.sdp);
            }

            // If we receive a new ICE candidate → add it to our peer connection
            else if (message.type === 'iceCandidate') {
                await pc.addIceCandidate(message.candidate);
            }
        });

        // ---------------- Local Media Capturing ----------------

        const startLocalMedia = async () => {
            try {
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
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        startLocalMedia();

        // Cleanup listeners on unmount
        return () => {
            socket.off('joined');
            socket.off('message');
        };

    }, [socket, userId, targetId]);


    // ---------------- Create Offer ----------------
    const callPeer = async () => {
        if (!pcRef.current || !socket || !userId || !targetId) return;
        const pc = pcRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('message', {
            type: "offer",
            sdp: pc.localDescription,
            from: userId,
            to: targetId,
        });
    };


    return (
        <div className="flex flex-col items-center gap-4 p-8">
            <h2 className="text-2xl font-bold mb-4">WebRTC Video Call</h2>
            
            <div className="flex gap-4">
                <div>
                    <h3 className="text-lg font-semibold mb-2">🟢 Local Video</h3>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-80 border border-gray-300 rounded bg-black"
                    />
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">🔵 Remote Video</h3>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-80 border border-gray-300 rounded bg-black"
                    />
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
                <input
                    placeholder="Enter Peer ID"
                    value={targetId || ""}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="border border-gray-300 px-3 py-2 rounded"
                />
                <button
                    onClick={callPeer}
                    disabled={!targetId || !socket}
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
                >
                    Call Peer
                </button>
            </div>

            {userId && (
                <div className="mt-2 p-3 bg-gray-100 rounded">
                    <p className="text-sm text-gray-700">
                        Your ID: <b className="font-mono">{userId}</b>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Share this ID with someone to receive a call
                    </p>
                </div>
            )}
        </div>
    );
};