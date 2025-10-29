// import type { RefObject } from 'react';

// interface VideoPlayerProps {
//     videoRef: RefObject<HTMLVideoElement | null>;
//     label: string;
//     muted?: boolean;
//     isVideoEnabled?: boolean;
//     isLocal: boolean;
// }

// export const VideoPlayer = ({
//     videoRef,
//     label,
//     muted = false,
//     isVideoEnabled = true,
//     isLocal
// }: VideoPlayerProps) => {
//     return (
//         <div className="relative">
//             <h3 className="text-lg font-semibold mb-2">{label}</h3>
//             <div className="relative w-80 h-60 bg-black rounded border border-gray-300 overflow-hidden">
//                 {isLocal && (
//                     <video
//                         ref={videoRef}
//                         autoPlay
//                         playsInline
//                         muted={muted}
//                         className="transform -scale-x-100 w-full h-full object-cover"
//                     />
//                 )}
//                 {!isLocal && (
//                     <video
//                         ref={videoRef}
//                         autoPlay
//                         playsInline
//                         muted={muted}
//                         className="w-full h-full object-cover"
//                     />
//                 )}

//                 {!isVideoEnabled && (
//                     <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
//                         <span className="text-white text-sm">Video Off</span>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

import React, { useEffect, useState, useRef } from 'react';
import { SignLanguageOverlay } from './SignLanguageOverlay';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    label: string;
    muted?: boolean;
    isVideoEnabled?: boolean;
    isLocal?: boolean;
    enableSignLanguage?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoRef,
    label,
    muted = false,
    isVideoEnabled = true,
    isLocal = false,
    enableSignLanguage = false,
}) => {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
    const hasSetCanvasRef = useRef(false); // Track if we've set the canvas

    // Unique instance ID to prevent MediaPipe conflicts
    const instanceId = isLocal ? 'local' : 'remote';

    // Only enable sign language detection for local video with landmarks
    // Remote video will only run inference without showing landmarks
    const showLandmarks = isLocal && enableSignLanguage;

    // Set video element
    useEffect(() => {
        if (videoRef.current) {
            console.log(`[${instanceId}] 📹 Video element ready`);
            setVideoElement(videoRef.current);
        }
    }, [videoRef, instanceId]);

    // Set canvas element only for local video
    useEffect(() => {
        if (canvasRef.current && showLandmarks && !hasSetCanvasRef.current) {
            console.log(`[${instanceId}] 🎨 Canvas element ready`);
            setCanvasElement(canvasRef.current);
            hasSetCanvasRef.current = true;
        }

        // Reset when sign language is disabled
        if (!showLandmarks && hasSetCanvasRef.current) {
            hasSetCanvasRef.current = false;
        }
    }, [showLandmarks, instanceId]);

    const { prediction, detectedHand, modelReady, handsReady } = useSignLanguageDetection({
        videoElement: enableSignLanguage ? videoElement : null,
        canvasElement: showLandmarks ? canvasElement : null,
        enabled: enableSignLanguage && isVideoEnabled,
        width: 640,
        height: 480,
        instanceId,
    });

    return (
        <div className="relative bg-black rounded-lg overflow-hidden shadow-lg w-full max-w-md">
            {/* Label */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm z-10">
                {label}
                {enableSignLanguage && (
                    <span className="ml-2 text-xs">
                        {!modelReady ? '⏳' : !handsReady ? '🔄' : '✅'}
                    </span>
                )}
            </div>

            {/* Sign Language Detection Overlay - Show for both local and remote */}
            {enableSignLanguage && (
                <SignLanguageOverlay
                    prediction={prediction}
                    detectedHand={detectedHand}
                    modelReady={modelReady}
                />
            )}

            {/* Always render video element but hide when canvas is shown */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                style={{
                    display: !isVideoEnabled ? 'none' : showLandmarks ? 'none' : 'block',
                    width: '100%',
                    height: 'auto',
                    transform: isLocal ? 'scaleX(-1)' : 'none'
                }}
            />

            {/* Canvas for local video with landmarks - positioned absolutely */}
            {showLandmarks && isVideoEnabled && (
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        transform: isLocal ? 'scaleX(-1)' : 'none'
                    }}
                />
            )}

            {/* Video off placeholder */}
            {!isVideoEnabled && (
                <div className="flex items-center justify-center h-64 bg-gray-800">
                    <span className="text-white text-4xl">📹</span>
                </div>
            )}
        </div>
    );
};
