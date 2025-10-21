import { useEffect, useState } from 'react';

const TURN_API = 'https://webrtc-video-calling-demo.onrender.com/api/turn-credentials';

export const useTurnServers = () => {
    const [turnServers, setTurnServers] = useState<RTCIceServer[]>([]);
    const [isLoadingTurn, setIsLoadingTurn] = useState(true);

    useEffect(() => {
        const fetchTurnCredentials = async () => {
            try {
                const response = await fetch(TURN_API);
                const data = await response.json();

                if (data.iceServers && Array.isArray(data.iceServers)) {
                    setTurnServers(data.iceServers);
                    console.log('TURN servers loaded:', data.iceServers);
                }
            } catch (error) {
                console.error('Error fetching TURN credentials:', error);
                setTurnServers([{ urls: 'stun:stun.l.google.com:19302' }]);
            } finally {
                setIsLoadingTurn(false);
            }
        };

        fetchTurnCredentials();
    });

    return { turnServers, isLoadingTurn };
};