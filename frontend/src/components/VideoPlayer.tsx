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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasStream, setHasStream] = useState(false);

    const instanceId = isLocal ? 'local' : 'remote';
    const showSignAssist = isLocal && enableSignLanguage && isVideoEnabled;

    // ✅ Check if video has stream and ensure it's playing
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const checkStream = () => {
            const hasValidStream =
                !!video.srcObject &&
                video.readyState >= video.HAVE_METADATA &&
                video.videoWidth > 0 &&
                video.videoHeight > 0;

            if (hasValidStream !== hasStream) {
                console.log(`[${instanceId}] Stream status changed: ${hasValidStream}`, {
                    srcObject: !!video.srcObject,
                    readyState: video.readyState,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    paused: video.paused
                });
                setHasStream(hasValidStream);
            }

            // Ensure video is playing when it has a valid stream
            if (hasValidStream && video.paused && showSignAssist) {
                console.log(`[${instanceId}] Video is paused, attempting to play...`);
                video.play().catch(err => {
                    console.error(`[${instanceId}] Failed to play video:`, err);
                });
            }
        };

        checkStream();
        video.addEventListener('loadedmetadata', checkStream);
        video.addEventListener('loadeddata', checkStream);
        video.addEventListener('playing', checkStream);
        video.addEventListener('pause', checkStream);

        const interval = setInterval(checkStream, 500);

        return () => {
            video.removeEventListener('loadedmetadata', checkStream);
            video.removeEventListener('loadeddata', checkStream);
            video.removeEventListener('playing', checkStream);
            video.removeEventListener('pause', checkStream);
            clearInterval(interval);
        };
    }, [videoRef, instanceId, hasStream, showSignAssist]);

    // ✅ Custom hook for hand + ONNX detection
    const { prediction, detectedHand, modelReady, handsReady } = useSignLanguageDetection({
        videoElement: showSignAssist && hasStream ? videoRef.current : null,
        canvasElement: showSignAssist && hasStream ? canvasRef.current : null,
        enabled: showSignAssist && hasStream,
        width: 640,
        height: 480,
        instanceId,
    });

    // 🧠 Debug logging
    useEffect(() => {
        if (enableSignLanguage) {
            console.log(
                `[${instanceId}] Detection state → enabled=${showSignAssist}, stream=${hasStream}, handsReady=${handsReady}, modelReady=${modelReady}`
            );
        }
    }, [showSignAssist, hasStream, handsReady, modelReady, enableSignLanguage, instanceId]);

    return (
        <div className="relative bg-black rounded-lg overflow-hidden shadow-lg w-full max-w-md">
            {/* Label */}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-3 py-1 rounded text-sm z-10">
                {label}
                {enableSignLanguage && isLocal && (
                    <span className="ml-2 text-xs">
                        {!hasStream ? '⏸️ No Stream' :
                            !modelReady ? '⏳ Loading Model' :
                                !handsReady ? '🔄 Init Hands' :
                                    '✅ Active'}
                    </span>
                )}
            </div>

            {/* Sign Language Detection Overlay */}
            {showSignAssist && hasStream && (
                <SignLanguageOverlay
                    prediction={prediction}
                    detectedHand={detectedHand}
                    modelReady={modelReady}
                />
            )}

            {/* Video element - ALWAYS mounted, just hidden when needed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                style={{
                    display: showSignAssist && hasStream ? 'none' : (isVideoEnabled ? 'block' : 'none'),
                    width: '100%',
                    height: 'auto',
                    transform: isLocal ? 'scaleX(-1)' : 'none',
                }}
            />

            {/* Canvas shows video + landmarks when Sign Assist is enabled */}
            {showSignAssist && hasStream && (
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        transform: isLocal ? 'scaleX(-1)' : 'none',
                    }}
                />
            )}

            {/* Placeholder when video is disabled */}
            {!isVideoEnabled && (
                <div className="flex items-center justify-center h-64 bg-gray-800">
                    <span className="text-white text-4xl">📹</span>
                </div>
            )}
        </div>
    );
};