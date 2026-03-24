// import { useEffect, useRef, useState } from 'react';
// import type { MediaControls } from '../types/webrtc.types';

// export const useMediaStream = () => {
//     const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//     const [mediaControls, setMediaControls] = useState<MediaControls>({
//         video: true,
//         audio: true,
//     });
//     const localVideoRef = useRef<HTMLVideoElement | null>(null);

//     useEffect(() => {
//         const startLocalMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({
//                     video: true,
//                     audio: true,
//                 });

//                 setLocalStream(stream);

//                 if (localVideoRef.current) {
//                     localVideoRef.current.srcObject = stream;
//                 }
//             } catch (error) {
//                 console.error('Error accessing media devices:', error);
//             }
//         };

//         startLocalMedia();

//         return () => {
//             localStream?.getTracks().forEach(track => track.stop());
//         };
//     }, []);

//     const toggleVideo = () => {
//         if (localStream) {
//             const videoTrack = localStream.getVideoTracks()[0];
//             if (videoTrack) {
//                 videoTrack.enabled = !videoTrack.enabled;
//                 setMediaControls(prev => ({ ...prev, video: videoTrack.enabled }));
//             }
//         }
//     };

//     const toggleAudio = () => {
//         if (localStream) {
//             const audioTrack = localStream.getAudioTracks()[0];
//             if (audioTrack) {
//                 audioTrack.enabled = !audioTrack.enabled;
//                 setMediaControls(prev => ({ ...prev, audio: audioTrack.enabled }));
//             }
//         }
//     };

//     return {
//         localStream,
//         localVideoRef,
//         mediaControls,
//         toggleVideo,
//         toggleAudio,
//     };
// };

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MediaControls } from '../types/webrtc.types';

export const useMediaStream = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mediaControls, setMediaControls] = useState<MediaControls>({
        video: true,
        audio: true,
    });
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

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
            }
        };

        startLocalMedia();

        return () => {
            cancelled = true;
        };
    }, []);

    // Cleanup tracks when stream changes or unmounts
    useEffect(() => {
        return () => {
            localStream?.getTracks().forEach(track => track.stop());
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
                audioTrack.enabled = !audioTrack.enabled;
                setMediaControls(prev => ({ ...prev, audio: audioTrack.enabled }));
            }
        }
    }, [localStream]);

    return {
        localStream,
        mediaControls,
        toggleVideo,
        toggleAudio,
    };
};
