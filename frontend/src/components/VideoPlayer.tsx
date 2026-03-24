// import React, { useEffect, useState, useRef } from 'react';
// import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

// interface VideoPlayerProps {
//     videoRef: React.RefObject<HTMLVideoElement | null>;
//     label: string;
//     muted?: boolean;
//     isVideoEnabled?: boolean;
//     isLocal?: boolean;
//     enableSignLanguage?: boolean;
//     onPredictionChange?: (
//         prediction: { label: string; confidence: number; inferenceTime: number } | null,
//         detectedHand: boolean
//     ) => void;
// }

// export const VideoPlayer: React.FC<VideoPlayerProps> = ({
//     videoRef,
//     label,
//     muted = false,
//     isVideoEnabled = true,
//     isLocal = false,
//     enableSignLanguage = false,
//     onPredictionChange,
// }) => {
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const [hasStream, setHasStream] = useState(false);

//     const instanceId = isLocal ? 'local' : 'remote';
//     const showSignAssist = isLocal && enableSignLanguage && isVideoEnabled;

//     // ✅ Detect stream availability
//     useEffect(() => {
//         const video = videoRef.current;
//         if (!video) return;

//         const checkStream = () => {
//             const active =
//                 !!video.srcObject &&
//                 video.readyState >= video.HAVE_METADATA &&
//                 video.videoWidth > 0 &&
//                 video.videoHeight > 0;

//             if (active !== hasStream) {
//                 setHasStream(active);
//             }

//             if (active && video.paused) {
//                 video.play().catch(() => { });
//             }
//         };

//         checkStream();
//         const interval = setInterval(checkStream, 300);
//         return () => clearInterval(interval);
//     }, [videoRef, instanceId, hasStream]);

//     // ✅ Hand + ONNX detection
//     const { prediction, detectedHand, modelReady, handsReady } = useSignLanguageDetection({
//         videoElement: showSignAssist && hasStream ? videoRef.current : null,
//         canvasElement: showSignAssist && hasStream ? canvasRef.current : null,
//         enabled: showSignAssist && hasStream,
//         width: 640,
//         height: 480,
//         instanceId,
//     });

//     // ✅ Send prediction up to parent
//     useEffect(() => {
//         if (!enableSignLanguage || !hasStream) return;
//         if (typeof onPredictionChange !== 'function') return;

//         onPredictionChange(
//             prediction
//                 ? {
//                     label: prediction.label,
//                     confidence: prediction.confidence,
//                     inferenceTime: prediction.inferenceTime,
//                 }
//                 : null,
//             !!detectedHand
//         );
//     }, [prediction, detectedHand, hasStream, enableSignLanguage, onPredictionChange]);

//     const showCanvas = showSignAssist && hasStream && handsReady && modelReady;

//     return (
//         <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 aspect-video">
//             {/* Label Badge */}
//             <div className="absolute top-3 left-3 z-20">
//                 <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-lg border border-white/20">
//                     <div className="flex items-center gap-2">
//                         <span className="font-bold">{label}</span>
//                         {enableSignLanguage && isLocal && (
//                             <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
//                                 {!hasStream
//                                     ? '⏸ No Stream'
//                                     : !modelReady
//                                         ? '⏳ Loading'
//                                         : !handsReady
//                                             ? '🔄 Init'
//                                             : '✨ Active'}
//                             </span>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Video Element */}
//             <video
//                 ref={videoRef}
//                 autoPlay
//                 playsInline
//                 muted={muted}
//                 style={{
//                     display: !showCanvas && isVideoEnabled ? 'block' : 'none',
//                     width: '100%',
//                     height: '100%',
//                     objectFit: 'cover',
//                     transform: isLocal ? 'scaleX(-1)' : 'none',
//                 }}
//             />

//             {/* Canvas for Hand Landmarks */}
//             <canvas
//                 ref={canvasRef}
//                 width={640}
//                 height={480}
//                 style={{
//                     display: showCanvas ? 'block' : 'none',
//                     width: '100%',
//                     height: '100%',
//                     objectFit: 'cover',
//                     transform: isLocal ? 'scaleX(-1)' : 'none',
//                 }}
//             />

//             {/* Placeholder */}
//             {!isVideoEnabled && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
//                     <div className="text-8xl mb-4 opacity-50">📹</div>
//                     <p className="text-gray-400 font-semibold">Camera Off</p>
//                 </div>
//             )}

//             {/* Loading Overlay */}
//             {isVideoEnabled && !hasStream && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//                     <div className="text-center">
//                         <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4 mx-auto"></div>
//                         <p className="text-gray-400">Connecting...</p>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSignLanguageDetection } from '../hooks/useSignLanguageDetection';

interface VideoPlayerProps {
    // For remote video: pass a ref so useWebRTC can assign srcObject externally
    videoRef?: React.RefObject<HTMLVideoElement | null>;
    // For local video: pass the stream directly; we attach it via callback ref
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
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoRef,
    stream,
    label,
    muted = false,
    isVideoEnabled = true,
    isLocal = false,
    enableSignLanguage = false,
    onPredictionChange,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasStream, setHasStream] = useState(false);

    // Internal ref used when we own the video element (local stream via callback ref)
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);

    // The ref we actually read from — either the external one (remote) or our internal one (local)
    const activeRef = videoRef ?? internalVideoRef;

    const instanceId = isLocal ? 'local' : 'remote';
    const showSignAssist = isLocal && enableSignLanguage && isVideoEnabled;

    // Callback ref: fires the instant the <video> element mounts in the DOM.
    // This is the fix for the lobby→call transition race condition — no effect
    // timing issues, no stale refs. Only used for local video (stream prop path).
    const callbackRef = useCallback((node: HTMLVideoElement | null) => {
        internalVideoRef.current = node;
        if (node && stream) {
            node.srcObject = stream;
        }
    }, [stream]);

    // If the stream prop changes after mount (e.g. re-acquired), re-attach it
    useEffect(() => {
        if (!stream || !internalVideoRef.current) return;
        if (internalVideoRef.current.srcObject !== stream) {
            internalVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Detect stream availability (polls readyState so hasStream stays accurate)
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

    return (
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 aspect-video">
            {/* Label Badge */}
            <div className="absolute top-3 left-3 z-20">
                <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-lg border border-white/20">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{label}</span>
                        {enableSignLanguage && isLocal && (
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {!hasStream
                                    ? '⏸ No Stream'
                                    : !modelReady
                                        ? '⏳ Loading'
                                        : !handsReady
                                            ? '🔄 Init'
                                            : '✨ Active'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Video Element —
                Local:  use callbackRef so srcObject is set at mount time (fixes race condition)
                Remote: use the external videoRef so useWebRTC can assign srcObject to it */}
            <video
                ref={isLocal ? callbackRef : videoRef}
                autoPlay
                playsInline
                muted={muted}
                style={{
                    display: !showCanvas && isVideoEnabled ? 'block' : 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: isLocal ? 'scaleX(-1)' : 'none',
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
                    objectFit: 'cover',
                    transform: isLocal ? 'scaleX(-1)' : 'none',
                }}
            />

            {/* Placeholder */}
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="text-8xl mb-4 opacity-50">📹</div>
                    <p className="text-gray-400 font-semibold">Camera Off</p>
                </div>
            )}

            {/* Loading Overlay */}
            {isVideoEnabled && !hasStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4 mx-auto"></div>
                        <p className="text-gray-400">Connecting...</p>
                    </div>
                </div>
            )}
        </div>
    );
};