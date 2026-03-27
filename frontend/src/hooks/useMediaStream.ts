import { useEffect, useState, useCallback } from 'react';
import type { MediaControls } from '../types/webrtc.types';

export const useMediaStream = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mediaControls, setMediaControls] = useState<MediaControls>({
        video: true,
        audio: true,
    });
    const [micError, setMicError] = useState<boolean>(false);

    // Acquire media stream on mount
    useEffect(() => {
        let cancelled = false;

        const startLocalMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                if (cancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                setLocalStream(stream);
            } catch (error) {
                console.error('Error accessing media devices:', error);
                
                // Fallback to video only if audio + video fails
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (cancelled) {
                        videoStream.getTracks().forEach(track => track.stop());
                        return;
                    }
                    setLocalStream(videoStream);
                    setMicError(true);
                    setMediaControls(prev => ({ ...prev, audio: false }));
                } catch (videoError) {
                    console.error('Error accessing video only:', videoError);
                    // Both failed
                    setMicError(true);
                }
            }
        };

        startLocalMedia();

        return () => {
            cancelled = true;
        };
    }, []);

    // Track hardware level changes to the mic
    useEffect(() => {
        if (!localStream) return;

        const handleHardwareMute = () => {
            setMicError(true);
            setMediaControls(prev => ({ ...prev, audio: false }));
        };

        const handleHardwareUnmute = () => {
            setMicError(false);
            setMediaControls(prev => ({ ...prev, audio: true }));
        };

        const audioTracks = localStream.getAudioTracks();
        
        audioTracks.forEach(track => {
            // If track is already muted by OS when acquired
            if (track.muted || track.readyState === 'ended') {
                handleHardwareMute();
            }
            
            track.addEventListener('mute', handleHardwareMute);
            track.addEventListener('ended', handleHardwareMute);
            track.addEventListener('unmute', handleHardwareUnmute);
        });

        return () => {
            audioTracks.forEach(track => {
                track.removeEventListener('mute', handleHardwareMute);
                track.removeEventListener('ended', handleHardwareMute);
                track.removeEventListener('unmute', handleHardwareUnmute);
            });
            localStream.getTracks().forEach(track => track.stop());
        };
    }, [localStream]);


    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setMediaControls(prev => ({ ...prev, video: videoTrack.enabled }));
            }
        }
    }, [localStream]);

    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                if (!audioTrack.enabled && (audioTrack.muted || audioTrack.readyState === 'ended')) {
                    // They tried to turn ON audio, but the hardware is muted or disconnected
                    setMicError(true);
                    setMediaControls(prev => ({ ...prev, audio: false }));
                    return;
                }
                
                audioTrack.enabled = !audioTrack.enabled;
                setMediaControls(prev => ({ ...prev, audio: audioTrack.enabled }));
            } else {
                setMicError(true);
            }
        } else {
            setMicError(true);
        }
    }, [localStream]);

    const dismissMicError = useCallback(() => {
        setMicError(false);
    }, []);

    return {
        localStream,
        mediaControls,
        toggleVideo,
        toggleAudio,
        micError,
        dismissMicError,
    };
};
