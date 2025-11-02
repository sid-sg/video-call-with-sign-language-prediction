import React, { useEffect, useState, useRef } from 'react';
// import { SignLanguageOverlay } from './SignLanguageOverlay';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

interface VideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    label: string;
    muted?: boolean;
    isVideoEnabled?: boolean;
    isLocal?: boolean;
    enableSignLanguage?: boolean;
    onPredictionChange?: (
        prediction: { label: string; confidence: number; inferenceTime: number } | null,
        detectedHand: boolean
    ) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoRef,
    label,
    muted = false,
    isVideoEnabled = true,
    isLocal = false,
    enableSignLanguage = false,
    onPredictionChange,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasStream, setHasStream] = useState(false);

    const instanceId = isLocal ? 'local' : 'remote';
    const showSignAssist = isLocal && enableSignLanguage && isVideoEnabled;

    // ✅ Detect stream availability
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const checkStream = () => {
            const active =
                !!video.srcObject &&
                video.readyState >= video.HAVE_METADATA &&
                video.videoWidth > 0 &&
                video.videoHeight > 0;

            if (active !== hasStream) {
                setHasStream(active);
                console.log(`[${instanceId}] Stream ready:`, active);
            }

            if (active && video.paused) {
                video.play().catch(() => { });
            }
        };

        checkStream();
        const interval = setInterval(checkStream, 300);
        return () => clearInterval(interval);
    }, [videoRef, instanceId, hasStream]);

    // ✅ Hand + ONNX detection
    const { prediction, detectedHand, modelReady, handsReady } = useSignLanguageDetection({
        videoElement: showSignAssist && hasStream ? videoRef.current : null,
        canvasElement: showSignAssist && hasStream ? canvasRef.current : null,
        enabled: showSignAssist && hasStream,
        width: 640,
        height: 480,
        instanceId,
    });

    // ✅ Send prediction up to parent
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

    // Debug
    useEffect(() => {
        if (!enableSignLanguage) return;
        console.log(
            `[${instanceId}] state → stream=${hasStream}, hands=${handsReady}, model=${modelReady}, pred=${prediction?.label}`
        );
    }, [hasStream, handsReady, modelReady, prediction, enableSignLanguage, instanceId]);

    const showCanvas = showSignAssist && hasStream && handsReady && modelReady;

    return (
        <div className="relative bg-black rounded-lg overflow-hidden shadow-lg w-full max-w-md">
            <div className="absolute top-2 left-2 bg-black/50 text-white px-3 py-1 rounded text-sm z-10">
                {label}{' '}
                {enableSignLanguage && isLocal && (
                    <span className="ml-2 text-xs">
                        {!hasStream
                            ? '⏸ No Stream'
                            : !modelReady
                                ? '⏳ Model'
                                : !handsReady
                                    ? '👐 Init'
                                    : '✅ Ready'}
                    </span>
                )}
            </div>

            {/* 🔥 Overlay (Top) */}
            {/* {showCanvas && (
                <SignLanguageOverlay
                    prediction={prediction}
                    detectedHand={!!detectedHand}
                    modelReady={modelReady}
                />
            )} */}

            {/* 🎥 Video always renders but hidden when canvas draws */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                style={{
                    display: !showCanvas && isVideoEnabled ? 'block' : 'none',
                    width: '100%',
                    height: 'auto',
                    transform: isLocal ? 'scaleX(-1)' : 'none',
                }}
            />

            {/* 🖼 Canvas for drawing hands */}
            <canvas
                ref={canvasRef}
                width={640}
                height={480}
                style={{
                    display: showCanvas ? 'block' : 'none',
                    width: '100%',
                    height: 'auto',
                    transform: isLocal ? 'scaleX(-1)' : 'none',
                }}
            />

            {!isVideoEnabled && (
                <div className="flex items-center justify-center h-64 bg-gray-800">
                    <span className="text-white text-4xl">📹</span>
                </div>
            )}
        </div>
    );
};
