import { useEffect, useState, useCallback } from 'react';
import type { ChatMessage } from '../types/webrtc.types';

interface UseDataChannelProps {
    dataChannel: RTCDataChannel | null;
    userId: string | null;
}

export const useDataChannel = ({ dataChannel, userId }: UseDataChannelProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isChannelOpen, setIsChannelOpen] = useState(false);
    const [peerVideoEnabled, setPeerVideoEnabled] = useState(true);

    useEffect(() => {
        if (!dataChannel) {
            setIsChannelOpen(false);
            return;
        }

        console.log('useDataChannel: Attaching listeners to data channel');

        dataChannel.onopen = () => {
            console.log('Data channel is open');
            setIsChannelOpen(true);
        };

        dataChannel.onclose = () => {
            console.log('Data channel is closed');
            setIsChannelOpen(false);
        };

        dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };

        dataChannel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle media-state messages (video on/off)
                if (data.type === 'media-state') {
                    setPeerVideoEnabled(data.videoEnabled ?? true);
                    return;
                }

                // Handle chat messages
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

        // Handle channel being open already if it was created and opened fast
        if (dataChannel.readyState === 'open') {
            setIsChannelOpen(true);
        }

        // Cleanup: remove listeners
        return () => {
            if (dataChannel) {
                dataChannel.onopen = null;
                dataChannel.onclose = null;
                dataChannel.onerror = null;
                dataChannel.onmessage = null;
            }
        };
    }, [dataChannel]); // <-- Only depends on the dataChannel object

    const sendMessage = useCallback((text: string) => {
        if (!dataChannel || dataChannel.readyState !== 'open' || !userId) {
            console.warn('Data channel not ready or userId not set', {
                hasChannel: !!dataChannel,
                state: dataChannel?.readyState,
                hasUserId: !!userId
            });
            return;
        }

        // ... (rest of sendMessage is unchanged) ...
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

    const sendMediaState = useCallback((videoEnabled: boolean) => {
        if (!dataChannel || dataChannel.readyState !== 'open') return;
        try {
            dataChannel.send(JSON.stringify({
                type: 'media-state',
                videoEnabled,
            }));
        } catch (error) {
            console.error('Error sending media state:', error);
        }
    }, [dataChannel]);

    return {
        messages,
        sendMessage,
        isChannelOpen,
        peerVideoEnabled,
        sendMediaState,
    };
};
