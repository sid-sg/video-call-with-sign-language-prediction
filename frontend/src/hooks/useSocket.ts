import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_SERVER = 'https://webrtc-video-calling-demo.onrender.com';

export const useSocket = () => {

    // Socket.IO connection state
    const [socket, setSocket] = useState<Socket | null>(null);

    // Connection to backend server status
    const [isConnected, setIsConnected] = useState(false);

    // User ID assigned by the server
    const [userId, setUserId] = useState<string | null>(null);


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

        setSocket(socketConnection);

        return () => {
            socketConnection.close();
        };
    }, []);

    return { socket, userId, isConnected };
};

