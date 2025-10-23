import { useEffect, useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '../types/webrtc.types';

interface UseDataChannelProps {
    peerConnection: RTCPeerConnection | null;
    userId: string | null;
    isInitiator: boolean;
}

export const useDataChannel = ({
    peerConnection,
    userId,
    isInitiator
}: UseDataChannelProps) => {
    const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isChannelOpen, setIsChannelOpen] = useState(false);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);

    useEffect(() => {
        if (!peerConnection) return;

        function setupDataChannel(dc: RTCDataChannel) {
            dc.onopen = () => {
                console.log('Data channel is open');
                setIsChannelOpen(true);
            };

            dc.onclose = () => {
                console.log('Data channel is closed');
                setIsChannelOpen(false);
            };

            dc.onerror = (error) => {
                console.error('Data channel error:', error);
            };

            dc.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const chatMessage: ChatMessage = {
                        id: `${data.senderId}-${Date.now()}`,
                        text: data.text,
                        senderId: data.senderId,
                        timestamp: data.timestamp,
                        isOwn: false,
                    };
                    setMessages(prev => [...prev, chatMessage]);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            dataChannelRef.current = dc;
            setDataChannel(dc);
        }

        if (isInitiator) {
            // Caller creates the data channel IMMEDIATELY
            console.log('Creating data channel as initiator');
            const channel = peerConnection.createDataChannel('chat', {
                ordered: true,
            });
            setupDataChannel(channel);
        } else {
            // Callee waits for the data channel
            console.log('Waiting for data channel as answerer');
            const handleDataChannel = (event: RTCDataChannelEvent) => {
                console.log('Data channel received by answerer');
                setupDataChannel(event.channel);
            };

            peerConnection.addEventListener('datachannel', handleDataChannel);

            return () => {
                peerConnection.removeEventListener('datachannel', handleDataChannel);
            };
        }

        return () => {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                dataChannelRef.current.close();
            }
        };
    }, [peerConnection, isInitiator]);

    const sendMessage = useCallback((text: string) => {
        if (!dataChannel || dataChannel.readyState !== 'open' || !userId) {
            console.warn('Data channel not ready or userId not set', {
                hasChannel: !!dataChannel,
                state: dataChannel?.readyState,
                hasUserId: !!userId
            });
            return;
        }

        const message = {
            text,
            senderId: userId,
            timestamp: Date.now(),
        };

        try {
            dataChannel.send(JSON.stringify(message));

            const chatMessage: ChatMessage = {
                id: `${userId}-${Date.now()}`,
                text,
                senderId: userId,
                timestamp: message.timestamp,
                isOwn: true,
            };
            setMessages(prev => [...prev, chatMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, [dataChannel, userId]);

    return {
        messages,
        sendMessage,
        isChannelOpen,
    };
};
