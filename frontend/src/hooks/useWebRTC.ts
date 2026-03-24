import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { SignalingMessage } from '../types/webrtc.types';

interface UseWebRTCProps {
  socket: Socket | null;
  userId: string | null;
  turnServers: RTCIceServer[];
  localStream: MediaStream | null;
  isLoadingTurn: boolean;
  // Room-based props
  peerId: string | null;
  isInitiator: boolean;
  roomStatus: 'idle' | 'waiting' | 'ready' | 'error';
}

export const useWebRTC = ({
  socket, userId, turnServers, localStream, isLoadingTurn,
  peerId, isInitiator, roomStatus,
}: UseWebRTCProps) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const peerIdRef = useRef(peerId);
  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);

  // Create peer connection when socket + stream are ready
  useEffect(() => {
    if (!socket || isLoadingTurn || !localStream) return;

    const config: RTCConfiguration = {
      iceServers: turnServers.length > 0 ? turnServers : [{ urls: 'stun:stun.l.google.com:19302' }],
      bundlePolicy: 'max-bundle',
    };

    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;
    setPeerConnection(pc);

    pc.ondatachannel = (event) => {
      console.log('Data channel received by answerer');
      setDataChannel(event.channel);
    };

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && peerIdRef.current) {
        socket.emit('message', {
          type: 'iceCandidate',
          candidate: event.candidate,
          from: userId,
          to: peerIdRef.current,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      setIsConnected(pc.connectionState === 'connected');
    };

    // Signaling message handler
    const handleMessage = async (message: SignalingMessage) => {
      if (message.type === 'offer') {
        if (pc.signalingState !== "stable") {
          console.warn("Skipping offer, signalingState=", pc.signalingState);
          return;
        }
        await pc.setRemoteDescription(message.sdp!);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('message', {
          type: 'answer',
          sdp: pc.localDescription,
          from: userId,
          to: message.from,
        });
      } else if (message.type === 'answer') {
        if (pc.signalingState !== "have-local-offer") {
          console.warn("Skipping answer, signalingState=", pc.signalingState);
          return;
        }
        await pc.setRemoteDescription(message.sdp!);
      } else if (message.type === 'iceCandidate') {
        if (!pcRef.current || pc.signalingState === 'closed') return;
        try {
          await pc.addIceCandidate(message.candidate!);
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    socket.on('message', handleMessage);

    return () => {
      socket.off('message', handleMessage);
      pc.close();
      setPeerConnection(null);
      setDataChannel(null);
      pcRef.current = null;
    };
  }, [socket, userId, isLoadingTurn, turnServers, localStream]);

  // Auto-initiate call when room is ready and we're the initiator
  useEffect(() => {
    if (roomStatus !== 'ready' || !isInitiator || !pcRef.current || !socket || !userId || !peerId) return;

    const pc = pcRef.current;

    const startCall = async () => {
      console.log('Room ready - initiating call to peer:', peerId);

      const channel = pc.createDataChannel('chat', { ordered: true });
      setDataChannel(channel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('message', {
        type: 'offer',
        sdp: pc.localDescription,
        from: userId,
        to: peerId,
      });
    };

    startCall();
  }, [roomStatus, isInitiator, peerId, socket, userId]);

  return {
    peerConnection,
    dataChannel,
    remoteVideoRef,
    isConnected,
    isInitiator,
  };
};