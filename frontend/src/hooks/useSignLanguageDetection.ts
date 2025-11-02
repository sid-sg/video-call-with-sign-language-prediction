import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';
import type { Results } from '@mediapipe/hands';

interface DetectionOptions {
    videoElement: HTMLVideoElement | null;
    canvasElement: HTMLCanvasElement | null;
    enabled: boolean;
    width?: number;
    height?: number;
    instanceId?: string;
}

interface Prediction {
    label: string;
    confidence: number;
    inferenceTime: number;
}

export function useSignLanguageDetection({
    videoElement,
    canvasElement,
    enabled,
    instanceId = 'default',
}: DetectionOptions) {
    const [handsReady, setHandsReady] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [detectedHand, setDetectedHand] = useState<any | null>(null);

    const handsRef = useRef<any>(null);
    const sessionRef = useRef<ort.InferenceSession | null>(null);
    const labelsRef = useRef<string[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const isProcessingRef = useRef(false);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

    // Update refs when props change
    useEffect(() => {
        videoElementRef.current = videoElement;
        canvasElementRef.current = canvasElement;
    }, [videoElement, canvasElement]);

    /** ---- Load ONNX model ---- */
    useEffect(() => {
        async function loadModel() {
            try {
                console.log(`[${instanceId}] ⏳ Loading ONNX model...`);
                const session = await ort.InferenceSession.create('/landmark_model.onnx', {
                    executionProviders: ['wasm'],
                });

                const labelResponse = await fetch('/landmark_classes.json');
                const labelText = await labelResponse.text();
                console.log(`[${instanceId}] 📄 Label file content:`, labelText);

                let labels: string[] = [];
                try {
                    const labelData = JSON.parse(labelText);
                    console.log(`[${instanceId}] 📋 Parsed label data:`, labelData);

                    // Check if it's a dictionary {"A": 0, "B": 1} or array ["A", "B"]
                    if (Array.isArray(labelData)) {
                        labels = labelData;
                    } else if (typeof labelData === 'object') {
                        // Convert {"A": 0, "B": 1} to ["A", "B"]
                        const entries = Object.entries(labelData) as [string, number][];
                        labels = new Array(entries.length);
                        entries.forEach(([label, index]) => {
                            labels[index] = label;
                        });
                    }
                    console.log(`[${instanceId}] 📋 Final label array:`, labels);
                } catch (e) {
                    console.error(`[${instanceId}] ❌ Failed to parse labels JSON:`, e);
                }

                // Log model info
                console.log(`[${instanceId}] 📋 Model inputs:`, session.inputNames);
                console.log(`[${instanceId}] 📋 Model outputs:`, session.outputNames);

                sessionRef.current = session;
                labelsRef.current = labels;
                setModelReady(true);
                console.log(`[${instanceId}] ✅ ONNX model ready with ${labels.length} classes`);
            } catch (err) {
                console.error(`[${instanceId}] ❌ ONNX load error`, err);
            }
        }
        loadModel();

        return () => {
            sessionRef.current = null;
        };
    }, [instanceId]);

    /** ---- Init MediaPipe Hands ---- */
    useEffect(() => {
        if (!enabled || !modelReady) {
            console.log(`[${instanceId}] ⏸️ Not initializing Hands: enabled=${enabled}, modelReady=${modelReady}`);
            return;
        }

        // Prevent double initialization
        if (handsRef.current) {
            console.log(`[${instanceId}] ⚠️ Hands already initialized, skipping`);
            return;
        }

        let isMounted = true;

        async function initHands() {
            try {
                const { Hands, HAND_CONNECTIONS } = await import('@mediapipe/hands');

                if (!isMounted) return;

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
                    const canvas = canvasElementRef.current;
                    const video = videoElementRef.current;

                    console.log(`[${instanceId}] 📊 onResults called, has canvas: ${!!canvas}, has video: ${!!video}`);

                    // Draw on canvas
                    if (canvas && video) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            console.log(`[${instanceId}] 🎨 Drawing to canvas...`);
                            ctx.save();
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            // ✅ CRITICAL: Draw the video frame first
                            try {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                console.log(`[${instanceId}] ✅ Video drawn successfully`);
                            } catch (err) {
                                console.error(`[${instanceId}] ❌ Failed to draw video:`, err);
                                isProcessingRef.current = false;
                                return;
                            }

                            // Draw hand landmarks if detected
                            if (results.multiHandLandmarks?.length) {
                                const lm = results.multiHandLandmarks[0];
                                setDetectedHand(lm);
                                console.log(`[${instanceId}] ✋ Hand detected with ${lm.length} landmarks`);

                                // Draw connections
                                ctx.strokeStyle = '#00FF00';
                                ctx.lineWidth = 2;
                                for (const connection of HAND_CONNECTIONS) {
                                    const from = lm[connection[0]];
                                    const to = lm[connection[1]];
                                    ctx.beginPath();
                                    ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
                                    ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
                                    ctx.stroke();
                                }

                                // Draw landmarks
                                ctx.fillStyle = '#FF0000';
                                for (const landmark of lm) {
                                    ctx.beginPath();
                                    ctx.arc(
                                        landmark.x * canvas.width,
                                        landmark.y * canvas.height,
                                        5,
                                        0,
                                        2 * Math.PI
                                    );
                                    ctx.fill();
                                }

                                // Run inference
                                console.log(`[${instanceId}] 🧠 Running inference...`);
                                await extractFeatures(lm);
                            } else {
                                console.log(`[${instanceId}] 🚫 No hand detected`);
                                setDetectedHand(null);
                                setPrediction(null);
                            }

                            ctx.restore();
                        }
                    }

                    isProcessingRef.current = false;
                });

                if (!isMounted) {
                    hands.close();
                    return;
                }

                handsRef.current = hands;
                setHandsReady(true);
                console.log(`[${instanceId}] ✅ MediaPipe Hands ready`);
            } catch (err) {
                console.error(`[${instanceId}] ❌ Hands init failed`, err);
            }
        }

        initHands();

        return () => {
            isMounted = false;
            console.log(`[${instanceId}] 🧹 Cleaning up Hands init effect`);
        };
    }, [enabled, modelReady, instanceId]);

    /** ---- Inference ---- */
    async function extractFeatures(landmarks: any[]) {
        const session = sessionRef.current;
        if (!session || !modelReady) {
            console.log(`[${instanceId}] ⚠️ Cannot run inference: session=${!!session}, modelReady=${modelReady}`);
            return;
        }

        const input = new Float32Array(landmarks.flatMap(p => [p.x, p.y, p.z]));

        try {
            const inputName = session.inputNames[0];
            const outputName = session.outputNames[0];

            const tensor = new ort.Tensor('float32', input, [1, input.length]);
            const feeds = { [inputName]: tensor };

            const start = performance.now();
            const output = await session.run(feeds);
            const end = performance.now();

            const outputTensor = output[outputName];
            const logits = Array.from(outputTensor.data as Float32Array);

            // Apply softmax to convert logits to probabilities
            const maxLogit = Math.max(...logits);
            const expScores = logits.map(x => Math.exp(x - maxLogit));
            const sumExp = expScores.reduce((a, b) => a + b, 0);
            const probabilities = expScores.map(x => x / sumExp);

            const maxIdx = probabilities.indexOf(Math.max(...probabilities));
            const labels = labelsRef.current;

            // Create new object to force React update
            const result = {
                label: (labels && labels[maxIdx]) ? labels[maxIdx] : `Class ${maxIdx}`,
                confidence: probabilities[maxIdx],
                inferenceTime: end - start,
                timestamp: Date.now(), // Force new object identity
            };

            console.log(`[${instanceId}] 🎯 Prediction: ${result.label} (${(result.confidence * 100).toFixed(1)}%) at index ${maxIdx}/${labels.length}`);

            // Force new object reference to trigger React re-render
            setPrediction({ ...result });
        } catch (err) {
            console.error(`[${instanceId}] ❌ Inference error`, err);
        }
    }

    /** ---- Processing Loop (No Camera - uses existing video) ---- */
    useEffect(() => {
        console.log(`[${instanceId}] 🔍 Processing loop check: enabled=${enabled}, handsReady=${handsReady}, hasVideo=${!!videoElement}, hasCanvas=${!!canvasElement}`);

        if (!enabled || !handsReady || !videoElement || !canvasElement) {
            console.log(`[${instanceId}] ⏸️ Processing loop not starting`);
            return;
        }

        const hands = handsRef.current;
        if (!hands) {
            console.log(`[${instanceId}] ⚠️ Hands ref is null at processing start`);
            return;
        }

        let isActive = true;
        let frameCount = 0;

        async function processFrame() {
            if (!isActive || !enabled || isProcessingRef.current) {
                if (isActive) {
                    animationFrameRef.current = requestAnimationFrame(processFrame);
                }
                return;
            }

            const currentHands = handsRef.current;
            if (!currentHands) {
                console.warn(`[${instanceId}] ⚠️ Hands ref is null, stopping processing`);
                return;
            }

            // Check if video is playing and has data
            if (videoElement && videoElement.readyState >= videoElement.HAVE_CURRENT_DATA &&
                videoElement.videoWidth > 0 &&
                videoElement.videoHeight > 0) {

                isProcessingRef.current = true;
                frameCount++;

                if (frameCount % 30 === 0) { // Log every 30 frames
                    console.log(`[${instanceId}] 📊 Processing frame #${frameCount}`);
                }

                try {
                    if (frameCount === 1) console.log(`[${instanceId}] 📤 Sending first frame to MediaPipe...`);
                    await currentHands.send({ image: videoElement });
                    if (frameCount === 1) console.log(`[${instanceId}] ✅ First frame sent successfully`);
                } catch (err) {
                    console.error(`[${instanceId}] ❌ Processing error:`, err);
                    console.error(`Video state: readyState=${videoElement.readyState}, width=${videoElement.videoWidth}, height=${videoElement.videoHeight}, paused=${videoElement.paused}`);
                    isProcessingRef.current = false;
                }
            } else {
                // Log when video is not ready
                if (frameCount < 5) {
                    // console.log(`[${instanceId}] ⏸️ Video not ready yet: readyState=${videoElement.readyState}, width=${videoElement.videoWidth}, height=${videoElement.videoHeight}, paused=${videoElement.paused}`);
                }
            }

            if (isActive) {
                animationFrameRef.current = requestAnimationFrame(processFrame);
            }
        }

        console.log(`[${instanceId}] 🎥 Starting processing loop...`);
        processFrame();

        return () => {
            console.log(`[${instanceId}] 🛑 Stopping processing loop (frameCount: ${frameCount})`);
            isActive = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            isProcessingRef.current = false;
        };
    }, [enabled, handsReady, videoElement, canvasElement]);

    // Separate cleanup effect for hands
    useEffect(() => {
        return () => {
            if (handsRef.current) {
                console.log(`[${instanceId}] 🧹 Cleaning up MediaPipe Hands`);
                handsRef.current.close();
                handsRef.current = null;
                setHandsReady(false);
            }
        };
    }, [instanceId]);

    return {
        prediction,
        detectedHand,
        modelReady,
        handsReady,
    };
}