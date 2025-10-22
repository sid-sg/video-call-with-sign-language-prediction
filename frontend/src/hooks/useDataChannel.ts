import { useEffect, useState, useCallback } from 'react';
import type { ChatMessage } from '../types/webrtc.types';

interface UseDataChannelProps {
    peerConnection: RTCPeerConnection | null;
    userId: string | null;
    isInitiator: boolean;
}

export const useDataChannel = ({ peerConnection, userId, isInitiator }: UseDataChannelProps) => {
    const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isChannelOpen, setIsChannelOpen] = useState(false);

    useEffect(() => {
        if (!peerConnection) return;

        let channel: RTCDataChannel;

        if (isInitiator) {
            // Caller creates the data channel
            channel = peerConnection.createDataChannel('chat', {
                ordered: true,
            });
            // console.log('Data channel created by initiator');
        } else {
            // Callee receives the data channel
            const handleDataChannel = (event: RTCDataChannelEvent) => {
                channel = event.channel;
                // console.log('Data channel received by answerer');
                setupDataChannel(channel);
            };

            peerConnection.addEventListener('datachannel', handleDataChannel);

            return () => {
                peerConnection.removeEventListener('datachannel', handleDataChannel);
            };
        }

        if (isInitiator) {
            setupDataChannel(channel);
        }

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

            setDataChannel(dc);
        }

        return () => {
            if (channel && channel.readyState === 'open') {
                channel.close();
            }
        };
    }, [peerConnection, isInitiator]);

    const sendMessage = useCallback((text: string) => {
        if (!dataChannel || dataChannel.readyState !== 'open' || !userId) {
            console.warn('Data channel not ready or userId not set');
            return;
        }

        const message = {
            text,
            senderId: userId,
            timestamp: Date.now(),
        };

        try {
            dataChannel.send(JSON.stringify(message));

            // Add to local messages
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

    return { messages, sendMessage, isChannelOpen, };
};
