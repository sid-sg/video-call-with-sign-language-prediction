// import { useRef, useState, useEffect } from 'react';
// import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
// import type { Results, NormalizedLandmarkList } from '@mediapipe/hands';

// interface Prediction {
//     label: string;
//     confidence: number;
//     inferenceTime: number;
// }

// interface UseSignLanguageDetectionProps {
//     videoElement: HTMLVideoElement | null;
//     canvasElement: HTMLCanvasElement | null;
//     enabled: boolean;
//     width?: number;
//     height?: number;
// }

// export const useSignLanguageDetection = ({
//     videoElement,
//     canvasElement,
//     enabled,
//     width = 640,
//     height = 480
// }: UseSignLanguageDetectionProps) => {
//     const workerRef = useRef<Worker | null>(null);
//     const canvasWorkerRef = useRef<Worker | null>(null);
//     const handsRef = useRef<Hands | null>(null);
//     const canvasTransferredRef = useRef(false);
//     const animationFrameRef = useRef<number | null>(null);

//     const [prediction, setPrediction] = useState<Prediction | null>(null);
//     const [detectedHand, setDetectedHand] = useState(false);
//     const [modelReady, setModelReady] = useState(false);
//     const [handsReady, setHandsReady] = useState(false);

//     // Initialize ONNX Worker
//     useEffect(() => {
//         if (workerRef.current) return;

//         console.log('🚀 Initializing ONNX Worker...');
//         const worker = new Worker(new URL('../workers/onnxWorker.ts', import.meta.url), { type: 'module' });
//         workerRef.current = worker;

//         worker.onmessage = (e) => {
//             const { type, result, error } = e.data;
//             switch (type) {
//                 case 'ready':
//                     setModelReady(true);
//                     console.log('✅ ONNX Model ready');
//                     break;
//                 case 'result':
//                     console.log('📊 Prediction received:', result);
//                     setPrediction(result);
//                     break;
//                 case 'error':
//                     console.error('❌ ONNX Worker error:', error);
//                     break;
//             }
//         };

//         (async () => {
//             try {
//                 console.log('📥 Fetching model files...');
//                 const modelResponse = await fetch('/landmark_model.onnx');
//                 const modelBuffer = await modelResponse.arrayBuffer();
//                 console.log('✅ Model loaded, size:', modelBuffer.byteLength, 'bytes');

//                 const classResponse = await fetch('/landmark_classes.json');
//                 const classData = await classResponse.json();
//                 console.log('✅ Classes loaded:', Object.keys(classData).length, 'classes');

//                 worker.postMessage({
//                     type: 'init',
//                     data: { modelBuffer, classData }
//                 }, [modelBuffer]);
//             } catch (err: any) {
//                 console.error('❌ Failed to load ONNX model', err);
//             }
//         })();

//         return () => {
//             console.log('🛑 Terminating ONNX Worker');
//             worker.terminate();
//             workerRef.current = null;
//         };
//     }, []);

//     // Initialize Canvas Worker and MediaPipe Hands
//     useEffect(() => {
//         console.log('🔍 Checking initialization conditions:', {
//             enabled,
//             hasVideo: !!videoElement,
//             hasCanvas: !!canvasElement,
//             modelReady,
//             handsExists: !!handsRef.current
//         });

//         if (!enabled) {
//             console.log('⏸️ Sign language detection disabled');
//             return;
//         }

//         if (!videoElement || !canvasElement) {
//             console.log('⏳ Waiting for video/canvas elements...');
//             return;
//         }

//         if (!modelReady) {
//             console.log('⏳ Waiting for model to be ready...');
//             return;
//         }

//         if (handsRef.current) {
//             console.log('✅ MediaPipe Hands already initialized');
//             return;
//         }

//         console.log('🚀 Initializing MediaPipe Hands and Canvas Worker...');
//         let isActive = true;

//         // Transfer canvas to worker (only once)
//         if (!canvasWorkerRef.current && !canvasTransferredRef.current) {
//             try {
//                 console.log('🎨 Transferring canvas to worker...');
//                 const offscreen = canvasElement.transferControlToOffscreen();
//                 canvasTransferredRef.current = true;

//                 const canvasWorker = new Worker(
//                     new URL('../workers/canvasWorker.ts', import.meta.url),
//                     { type: 'module' }
//                 );
//                 canvasWorkerRef.current = canvasWorker;

//                 canvasWorker.postMessage({
//                     type: 'init',
//                     data: { canvas: offscreen, width, height }
//                 }, [offscreen]);

//                 console.log('✅ Canvas worker initialized');
//             } catch (err) {
//                 console.error('❌ Canvas transfer failed:', err);
//                 return;
//             }
//         }

//         // Initialize MediaPipe Hands
//         console.log('🖐️ Creating MediaPipe Hands instance...');
//         const hands = new Hands({
//             locateFile: (file) => {
//                 const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
//                 console.log('📦 Loading MediaPipe file:', url);
//                 return url;
//             },
//         });

//         hands.setOptions({
//             maxNumHands: 1,
//             modelComplexity: 1,
//             minDetectionConfidence: 0.7,
//             minTrackingConfidence: 0.5,
//         });
//         console.log('⚙️ MediaPipe Hands options set');

//         hands.onResults(async (results: Results) => {
//             if (!isActive || !canvasWorkerRef.current) return;

//             const imageBitmap = await createImageBitmap(videoElement);

//             if (results.multiHandLandmarks?.length) {
//                 const landmarks = results.multiHandLandmarks[0];
//                 setDetectedHand(true);

//                 console.log('✋ Hand detected with', landmarks.length, 'landmarks');

//                 // Draw on canvas
//                 canvasWorkerRef.current.postMessage({
//                     type: 'draw',
//                     data: {
//                         imageBitmap,
//                         landmarks,
//                         connections: HAND_CONNECTIONS
//                     },
//                 }, [imageBitmap]);

//                 // Run inference
//                 if (workerRef.current) {
//                     const features = extractFeatures(landmarks);
//                     console.log('🧠 Sending inference request, features length:', features.length);
//                     workerRef.current.postMessage({
//                         type: 'infer',
//                         data: { landmarks: features },
//                     });
//                 } else {
//                     console.warn('⚠️ ONNX worker not ready');
//                 }
//             } else {
//                 setDetectedHand(false);
//                 setPrediction(null);

//                 // Draw plain video
//                 canvasWorkerRef.current.postMessage({
//                     type: 'draw',
//                     data: { imageBitmap, landmarks: [], connections: [] },
//                 }, [imageBitmap]);
//             }
//         });

//         handsRef.current = hands;
//         setHandsReady(true);

//         // Process frames
//         const processFrame = async () => {
//             if (isActive && videoElement && handsRef.current) {
//                 try {
//                     await handsRef.current.send({ image: videoElement });
//                 } catch (err) {
//                     console.error('❌ Error processing frame:', err);
//                 }
//             }
//             animationFrameRef.current = requestAnimationFrame(processFrame);
//         };

//         console.log('▶️ Starting frame processing...');
//         processFrame();

//         return () => {
//             console.log('🛑 Cleaning up MediaPipe Hands...');
//             isActive = false;
//             if (animationFrameRef.current) {
//                 cancelAnimationFrame(animationFrameRef.current);
//             }
//             if (handsRef.current) {
//                 handsRef.current.close();
//                 handsRef.current = null;
//             }
//         };
//     }, [enabled, videoElement, canvasElement, modelReady, width, height]);

//     // Cleanup canvas worker on unmount
//     useEffect(() => {
//         return () => {
//             if (canvasWorkerRef.current) {
//                 canvasWorkerRef.current.terminate();
//                 canvasWorkerRef.current = null;
//             }
//         };
//     }, []);

//     const extractFeatures = (landmarks: NormalizedLandmarkList): Float32Array => {
//         const features: number[] = [];
//         for (const l of landmarks) features.push(l.x, l.y, l.z);
//         return new Float32Array(features);
//     };

//     return {
//         prediction,
//         detectedHand,
//         modelReady,
//         handsReady,
//     };
// };

import { useRef, useState, useEffect } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Results, NormalizedLandmarkList } from '@mediapipe/hands';

// Define hand connections manually (21 landmarks, indices 0-20)
const HAND_CONNECTIONS: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],           // Index finger
    [0, 9], [9, 10], [10, 11], [11, 12],      // Middle finger
    [0, 13], [13, 14], [14, 15], [15, 16],    // Ring finger
    [0, 17], [17, 18], [18, 19], [19, 20],    // Pinky
    [5, 9], [9, 13], [13, 17]                 // Palm
];

interface Prediction {
    label: string;
    confidence: number;
    inferenceTime: number;
}

interface UseSignLanguageDetectionProps {
    videoElement: HTMLVideoElement | null;
    canvasElement: HTMLCanvasElement | null;
    enabled: boolean;
    width?: number;
    height?: number;
    instanceId: string; // Add unique ID to prevent conflicts
}

export const useSignLanguageDetection = ({
    videoElement,
    canvasElement,
    enabled,
    width = 640,
    height = 480,
    instanceId
}: UseSignLanguageDetectionProps) => {
    const workerRef = useRef<Worker | null>(null);
    const canvasWorkerRef = useRef<Worker | null>(null);
    const handsRef = useRef<Hands | null>(null);
    const canvasTransferredRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const initializingRef = useRef(false);

    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [detectedHand, setDetectedHand] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [handsReady, setHandsReady] = useState(false);

    // Initialize ONNX Worker (shared across instances)
    useEffect(() => {
        if (workerRef.current) return;

        console.log(`[${instanceId}] 🚀 Initializing ONNX Worker...`);
        const worker = new Worker(new URL('../workers/onnxWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type, result, error } = e.data;
            switch (type) {
                case 'ready':
                    setModelReady(true);
                    console.log(`[${instanceId}] ✅ ONNX Model ready`);
                    break;
                case 'result':
                    console.log(`[${instanceId}] 📊 Prediction:`, result.label);
                    setPrediction(result);
                    break;
                case 'error':
                    console.error(`[${instanceId}] ❌ ONNX Worker error:`, error);
                    break;
            }
        };

        (async () => {
            try {
                const modelResponse = await fetch('/landmark_model.onnx');
                const modelBuffer = await modelResponse.arrayBuffer();
                console.log(`[${instanceId}] ✅ Model loaded`);

                const classResponse = await fetch('/landmark_classes.json');
                const classData = await classResponse.json();
                console.log(`[${instanceId}] ✅ Classes loaded`);

                worker.postMessage({
                    type: 'init',
                    data: { modelBuffer, classData }
                }, [modelBuffer]);
            } catch (err: any) {
                console.error(`[${instanceId}] ❌ Failed to load ONNX model`, err);
            }
        })();

        return () => {
            console.log(`[${instanceId}] 🛑 Terminating ONNX Worker`);
            worker.terminate();
            workerRef.current = null;
        };
    }, [instanceId]);

    // Initialize Canvas Worker and MediaPipe Hands
    useEffect(() => {
        if (!enabled) {
            console.log(`[${instanceId}] ⏸️ Sign language detection disabled`);
            // Cleanup if disabled
            if (handsRef.current) {
                handsRef.current.close();
                handsRef.current = null;
                setHandsReady(false);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        if (!videoElement || !canvasElement) {
            console.log(`[${instanceId}] ⏳ Waiting for video/canvas elements...`);
            return;
        }

        if (!modelReady) {
            console.log(`[${instanceId}] ⏳ Waiting for model...`);
            return;
        }

        if (handsRef.current || initializingRef.current) {
            console.log(`[${instanceId}] ✅ Already initialized`);
            return;
        }

        initializingRef.current = true;
        console.log(`[${instanceId}] 🚀 Initializing MediaPipe Hands...`);
        let isActive = true;

        // Transfer canvas to worker (only once per canvas)
        if (!canvasWorkerRef.current && !canvasTransferredRef.current) {
            try {
                console.log(`[${instanceId}] 🎨 Transferring canvas...`);
                const offscreen = canvasElement.transferControlToOffscreen();
                canvasTransferredRef.current = true;

                const canvasWorker = new Worker(
                    new URL('../workers/canvasWorker.ts', import.meta.url),
                    { type: 'module' }
                );
                canvasWorkerRef.current = canvasWorker;

                canvasWorker.postMessage({
                    type: 'init',
                    data: { canvas: offscreen, width, height }
                }, [offscreen]);

                console.log(`[${instanceId}] ✅ Canvas worker ready`);
            } catch (err) {
                console.error(`[${instanceId}] ❌ Canvas transfer failed:`, err);
                initializingRef.current = false;
                return;
            }
        }

        // Initialize MediaPipe Hands - Create NEW instance for each video
        console.log(`[${instanceId}] 🖐️ Creating MediaPipe Hands instance...`);

        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
        });

        hands.onResults(async (results: Results) => {
            if (!isActive || !canvasWorkerRef.current) return;

            try {
                const imageBitmap = await createImageBitmap(videoElement);

                if (results.multiHandLandmarks?.length) {
                    const landmarks = results.multiHandLandmarks[0];
                    setDetectedHand(true);

                    // Draw on canvas
                    canvasWorkerRef.current.postMessage({
                        type: 'draw',
                        data: {
                            imageBitmap,
                            landmarks,
                            connections: HAND_CONNECTIONS
                        },
                    }, [imageBitmap]);

                    // Run inference
                    if (workerRef.current) {
                        const features = extractFeatures(landmarks);
                        workerRef.current.postMessage({
                            type: 'infer',
                            data: { landmarks: features },
                        });
                    }
                } else {
                    setDetectedHand(false);
                    setPrediction(null);

                    // Draw plain video
                    canvasWorkerRef.current.postMessage({
                        type: 'draw',
                        data: { imageBitmap, landmarks: [], connections: [] },
                    }, [imageBitmap]);
                }
            } catch (err) {
                console.error(`[${instanceId}] ❌ Error in onResults:`, err);
            }
        });

        handsRef.current = hands;
        setHandsReady(true);
        initializingRef.current = false;

        // Process frames
        const processFrame = async () => {
            if (!isActive || !handsRef.current) return;

            try {
                await handsRef.current.send({ image: videoElement });
            } catch (err) {
                console.error(`[${instanceId}] ❌ Error processing frame:`, err);
            }

            if (isActive) {
                animationFrameRef.current = requestAnimationFrame(processFrame);
            }
        };

        console.log(`[${instanceId}] ▶️ Starting frame processing...`);
        processFrame();

        return () => {
            console.log(`[${instanceId}] 🛑 Cleaning up MediaPipe...`);
            isActive = false;

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (handsRef.current) {
                handsRef.current.close();
                handsRef.current = null;
                setHandsReady(false);
            }

            initializingRef.current = false;
        };
    }, [enabled, videoElement, canvasElement, modelReady, width, height, instanceId]);

    // Cleanup canvas worker on unmount
    useEffect(() => {
        return () => {
            if (canvasWorkerRef.current) {
                canvasWorkerRef.current.terminate();
                canvasWorkerRef.current = null;
            }
        };
    }, []);

    const extractFeatures = (landmarks: NormalizedLandmarkList): Float32Array => {
        const features: number[] = [];
        for (const l of landmarks) features.push(l.x, l.y, l.z);
        return new Float32Array(features);
    };

    return {
        prediction,
        detectedHand,
        modelReady,
        handsReady,
    };
};
