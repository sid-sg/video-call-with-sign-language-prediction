import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { SignalingMessage } from '../types/webrtc.types';

interface UseWebRTCProps {
    socket: Socket | null;
    userId: string | null;
    turnServers: RTCIceServer[];
    localStream: MediaStream | null;
    isLoadingTurn: boolean;
}

export const useWebRTC = ({ socket, userId, turnServers, localStream, isLoadingTurn }: UseWebRTCProps) => {
    const pcRef = useRef<RTCPeerConnection | null>(null); // RTCPeerConnection reference
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isInitiator, setIsInitiator] = useState(false);


    useEffect(() => {
        if (!socket || isLoadingTurn || !localStream) return;

        const config: RTCConfiguration = {
            iceServers: turnServers.length > 0 ? turnServers : [{ urls: 'stun:stun.l.google.com:19302' }],
            bundlePolicy: 'max-bundle'
        };

        const pc = new RTCPeerConnection(config);
        pcRef.current = pc;

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });


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

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            setIsConnected(pc.connectionState === 'connected');
        };

        // ---------------- Signaling Message Handling ----------------

        const handleMessage = async (message: SignalingMessage) => {
            // If we are the callee and receive an offer → create & send back an answer
            if (message.type === 'offer') {
                setIsInitiator(false); // We are the answerer
                await pc.setRemoteDescription(message.sdp!);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('message', {
                    type: 'answer',
                    sdp: pc.localDescription,
                    from: userId,
                    to: message.from,
                });
            }

            // If we are the caller and receive an answer → set it as remote description
            else if (message.type === 'answer') {
                await pc.setRemoteDescription(message.sdp!);
            }

            // If we receive a new ICE candidate → add it to our peer connection
            else if (message.type === 'iceCandidate') {
                await pc.addIceCandidate(message.candidate!);
            }
        };

        socket.on('message', handleMessage);

        // Cleanup listeners on unmount
        return () => {
            socket.off('joined');
            socket.off('message');
        };

    }, [socket, userId, targetId, isLoadingTurn, turnServers]);

    const callPeer = async () => {
        if (!pcRef.current || !socket || !userId || !targetId) return;

        setIsInitiator(true); // We are the caller

        const pc = pcRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('message', {
            type: 'offer',
            sdp: pc.localDescription,
            from: userId,
            to: targetId,
        });
    };

    return {
        peerConnection: pcRef.current,
        remoteVideoRef,
        targetId,
        setTargetId,
        callPeer,
        isConnected,
        isInitiator,
    };

};