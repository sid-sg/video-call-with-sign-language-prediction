// import { useEffect, useState } from 'react';
// import { io, Socket } from 'socket.io-client';

// const BACKEND_SERVER = 'https://webrtc-video-calling-demo.onrender.com';

// export const useSocket = () => {

//     // Socket.IO connection state
//     const [socket, setSocket] = useState<Socket | null>(null);

//     // Connection to backend server status
//     const [isConnected, setIsConnected] = useState(false);

//     // User ID assigned by the server
//     const [userId, setUserId] = useState<string | null>(null);


//     useEffect(() => {
//         const socketConnection = io(BACKEND_SERVER);

//         socketConnection.on('connect', () => {
//             console.log("Connected to backend server");
//             setIsConnected(true);
//         });

//         socketConnection.on('disconnect', () => {
//             console.log("Disconnected from backend server");
//             setIsConnected(false);
//         });

//         socketConnection.on('joined', (message) => {
//             setUserId(message.id);
//             console.log('Received user ID:', message.id);
//         });

//         setSocket(socketConnection);

//         return () => {
//             socketConnection.close();
//         };
//     }, []);

//     return { socket, userId, isConnected };
// };

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_SERVER = 'https://webrtc-video-calling-demo.onrender.com';

interface RoomReadyData {
  roomCode: string;
  peerId: string;
  isInitiator: boolean;
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Room state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<'idle' | 'waiting' | 'ready' | 'error'>('idle');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);

  useEffect(() => {
    const socketConnection = io(BACKEND_SERVER);

    socketConnection.on('connect', () => {
      console.log("Connected to backend server");
      setIsConnected(true);
    });

    socketConnection.on('disconnect', () => {
      console.log("Disconnected from backend server");
      setIsConnected(false);
    });

    socketConnection.on('joined', (message) => {
      setUserId(message.id);
      console.log('Received user ID:', message.id);
    });

    // Room events
    socketConnection.on('room-created', (data: { roomCode: string }) => {
      setRoomCode(data.roomCode);
      setRoomStatus('waiting');
      setRoomError(null);
      console.log('Room created:', data.roomCode);
    });

    socketConnection.on('room-joined', (data: { roomCode: string }) => {
      setRoomCode(data.roomCode);
      setRoomStatus('waiting');
      setRoomError(null);
      console.log('Joined room:', data.roomCode);
    });

    socketConnection.on('room-ready', (data: RoomReadyData) => {
      setRoomCode(data.roomCode);
      setPeerId(data.peerId);
      setIsInitiator(data.isInitiator);
      setRoomStatus('ready');
      console.log('Room ready! Peer:', data.peerId, 'Initiator:', data.isInitiator);
    });

    socketConnection.on('room-error', (data: { message: string }) => {
      setRoomError(data.message);
      setRoomStatus('error');
      console.error('Room error:', data.message);
    });

    socketConnection.on('peer-left', (data: { roomCode: string }) => {
      setPeerId(null);
      setIsInitiator(false);
      setRoomStatus('waiting');
      console.log('Peer left room:', data.roomCode);
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.close();
    };
  }, []);

  const createRoom = useCallback(() => {
    if (socket) {
      setRoomError(null);
      socket.emit('create-room');
    }
  }, [socket]);

  const joinRoom = useCallback((code: string) => {
    if (socket && code.trim()) {
      setRoomError(null);
      socket.emit('join-room', { roomCode: code.trim().toUpperCase() });
    }
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('leave-room');
      setRoomCode(null);
      setRoomStatus('idle');
      setRoomError(null);
      setPeerId(null);
      setIsInitiator(false);
    }
  }, [socket]);

  return {
    socket,
    userId,
    isConnected,
    // Room
    roomCode,
    roomStatus,
    roomError,
    peerId,
    isInitiator,
    createRoom,
    joinRoom,
    leaveRoom,
  };
};