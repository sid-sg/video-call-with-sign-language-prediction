import React, { useEffect, useState, useRef, useCallback } from 'react';
import { User, Maximize2 } from 'lucide-react';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

interface VideoPlayerProps {
    stream?: MediaStream | null;
    label: string;
    muted?: boolean;
    isVideoEnabled?: boolean;
    isLocal?: boolean;
    enableSignLanguage?: boolean;
    onPredictionChange?: (
        prediction: { label: string; confidence: number; inferenceTime: number } | null,
        detectedHand: boolean
    ) => void;
    /** If true, use object-fit: contain (for screen shares) */
    isScreenShare?: boolean;
    /** Maximize callback — shown on hover */
    onMaximize?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    stream,
    label,
    muted = false,
    isVideoEnabled = true,
    isLocal = false,
    enableSignLanguage = false,
    onPredictionChange,
    isScreenShare = false,
    onMaximize,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasStream, setHasStream] = useState(false);

    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    const activeRef = internalVideoRef;

    const instanceId = isLocal ? 'local' : 'remote';
    const showSignAssist = isLocal && enableSignLanguage && isVideoEnabled;

    // Callback ref — sets srcObject whenever the DOM node mounts/remounts
    // or when the stream changes. Fixes layout-switch srcObject loss.
    const callbackRef = useCallback((node: HTMLVideoElement | null) => {
        internalVideoRef.current = node;
        if (node && stream) {
            node.srcObject = stream;
        }
    }, [stream]);

    // Re-attach stream if it changes after mount
    useEffect(() => {
        if (!stream || !internalVideoRef.current) return;
        if (internalVideoRef.current.srcObject !== stream) {
            internalVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Detect stream availability
    useEffect(() => {
        const video = activeRef.current;
        if (!video) return;

        const checkStream = () => {
            const active =
                !!video.srcObject &&
                video.readyState >= video.HAVE_METADATA &&
                video.videoWidth > 0 &&
                video.videoHeight > 0;

            if (active !== hasStream) {
                setHasStream(active);
            }

            if (active && video.paused) {
                video.play().catch(() => { });
            }
        };

        checkStream();
        const interval = setInterval(checkStream, 300);
        return () => clearInterval(interval);
    }, [activeRef, instanceId, hasStream]);

    // Hand + ONNX detection
    const { prediction, detectedHand, modelReady, handsReady } = useSignLanguageDetection({
        videoElement: showSignAssist && hasStream ? activeRef.current : null,
        canvasElement: showSignAssist && hasStream ? canvasRef.current : null,
        enabled: showSignAssist && hasStream,
        width: 640,
        height: 480,
        instanceId,
    });

    // Send prediction up to parent
    useEffect(() => {
        if (!enableSignLanguage || !hasStream) return;
        if (typeof onPredictionChange !== 'function') return;

        onPredictionChange(
            prediction
                ? {
                    label: prediction.label,
                    confidence: prediction.confidence,
                    inferenceTime: prediction.inferenceTime,
                }
                : null,
            !!detectedHand
        );
    }, [prediction, detectedHand, hasStream, enableSignLanguage, onPredictionChange]);

    const showCanvas = showSignAssist && hasStream && handsReady && modelReady;

    // Determine object-fit: screen shares should use 'contain' to show full content
    const objectFit = isScreenShare ? 'contain' : 'cover';
    // Don't mirror screen shares or remote video
    const shouldMirror = isLocal && !isScreenShare;

    return (
        <div className="video-tile relative w-full h-full overflow-hidden rounded-lg bg-surface-video">
            {/* Video Element */}
            <video
                ref={callbackRef}
                autoPlay
                playsInline
                muted={muted}
                style={{
                    display: !showCanvas && isVideoEnabled ? 'block' : 'none',
                    width: '100%',
                    height: '100%',
                    objectFit,
                    transform: shouldMirror ? 'scaleX(-1)' : 'none',
                }}
            />

            {/* Canvas for Hand Landmarks */}
            <canvas
                ref={canvasRef}
                width={640}
                height={480}
                style={{
                    display: showCanvas ? 'block' : 'none',
                    width: '100%',
                    height: '100%',
                    objectFit,
                    transform: shouldMirror ? 'scaleX(-1)' : 'none',
                }}
            />

            {/* Camera Off Placeholder — GMeet style */}
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-video">
                    <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                            width: 'clamp(64px, 15vw, 128px)',
                            height: 'clamp(64px, 15vw, 128px)',
                            background: isLocal
                                ? 'linear-gradient(135deg, hsl(210 80% 55%), hsl(230 70% 50%))'
                                : 'linear-gradient(135deg, hsl(340 70% 55%), hsl(20 80% 55%))',
                        }}
                    >
                        <span
                            className="text-white font-medium select-none"
                            style={{ fontSize: 'clamp(28px, 6vw, 56px)' }}
                        >
                            {label.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isVideoEnabled && !hasStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-video">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center animate-pulse">
                        <User size={40} className="text-muted-foreground" />
                    </div>
                </div>
            )}

            {/* Name Label — bottom left like GMeet */}
            <div className="absolute bottom-3 left-3 z-10">
                <span className="bg-background-70 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-md">
                    {label}
                    {enableSignLanguage && isLocal && (
                        <span className="ml-2 opacity-70">
                            {!hasStream
                                ? '⏸'
                                : !modelReady
                                    ? '⏳'
                                    : !handsReady
                                        ? '🔄'
                                        : '✨'}
                        </span>
                    )}
                </span>
            </div>

            {/* Maximize button — top right, visible on hover */}
            {onMaximize && (
                <button
                    onClick={onMaximize}
                    className="maximize-btn absolute top-3 right-3 z-10 w-8 h-8 rounded-md bg-background-70 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-all duration-200"
                    title="Maximize"
                >
                    <Maximize2 size={16} className="text-foreground" />
                </button>
            )}
        </div>
    );
};