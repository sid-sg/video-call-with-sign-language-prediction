import { useEffect, useRef, useState, useCallback } from 'react';
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

  // Store remote streams as STATE so React re-renders when they change,
  // and VideoPlayer's callbackRef can re-attach srcObject on mount/remount.
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Track the first remote stream ID so we can distinguish webcam vs screen
  const firstRemoteStreamIdRef = useRef<string | null>(null);
  const [hasRemoteScreen, setHasRemoteScreen] = useState(false);

  const peerIdRef = useRef(peerId);
  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);

  // Create peer connection when socket + stream are ready
  useEffect(() => {
    if (!socket || isLoadingTurn || !localStream) return;

    // Reset remote stream tracking
    firstRemoteStreamIdRef.current = null;
    setRemoteStream(null);
    setRemoteScreenStream(null);
    setHasRemoteScreen(false);

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
      const stream = event.streams[0];
      if (!stream) return;

      // First remote stream = webcam, subsequent = screen share
      if (!firstRemoteStreamIdRef.current) {
        firstRemoteStreamIdRef.current = stream.id;
        setRemoteStream(stream);
        console.log('Remote webcam stream received:', stream.id);
      } else if (stream.id !== firstRemoteStreamIdRef.current) {
        // This is a screen share stream
        setRemoteScreenStream(stream);
        setHasRemoteScreen(true);
        console.log('Remote screen share stream received:', stream.id);

        // When the screen share track ends, clean up
        event.track.onended = () => {
          setRemoteScreenStream(null);
          setHasRemoteScreen(false);
          console.log('Remote screen share track ended');
        };
      } else {
        // Same stream ID as webcam — update in case tracks changed
        setRemoteStream(stream);
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
      firstRemoteStreamIdRef.current = null;
      setRemoteStream(null);
      setRemoteScreenStream(null);
      setHasRemoteScreen(false);
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

  // Renegotiate when tracks change (screen share added/removed)
  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !socket || !userId || !peerIdRef.current) return;
    if (pc.signalingState !== 'stable') {
      console.warn('Cannot renegotiate, signalingState=', pc.signalingState);
      return;
    }

    console.log('Renegotiating after track change...');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('message', {
      type: 'offer',
      sdp: pc.localDescription,
      from: userId,
      to: peerIdRef.current,
    });
  }, [socket, userId]);

  return {
    peerConnection,
    dataChannel,
    remoteStream,
    remoteScreenStream,
    isConnected,
    isInitiator,
    hasRemoteScreen,
    renegotiate,
  };
};