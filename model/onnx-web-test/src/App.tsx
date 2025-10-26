import { useRef, useState, useEffect } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import type { Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

interface Prediction {
    label: string;
    confidence: number;
    inferenceTime: number;
}

function App() {
    const workerRef = useRef<Worker | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [detectedHand, setDetectedHand] = useState(false);
    const [handsReady, setHandsReady] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handsRef = useRef<Hands | null>(null);

    // 🧠 Initialize worker and model
    useEffect(() => {
        const worker = new Worker(new URL('./onnxWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type, result, error } = e.data;

            switch (type) {
                case 'ready':
                    setModelReady(true);
                    console.log('✅ ONNX Worker ready');
                    break;
                case 'result':
                    setPrediction(result);
                    break;
                case 'error':
                    console.error('Worker error:', error);
                    setError(error);
                    break;
            }
        };

        (async () => {
            try {
                const modelResponse = await fetch('/landmark_model.onnx');
                const modelBuffer = await modelResponse.arrayBuffer();
                const classResponse = await fetch('/landmark_classes.json');
                const classData = await classResponse.json();

                worker.postMessage({
                    type: 'init',
                    data: { modelBuffer, classData }
                });
            } catch (err: any) {
                console.error('❌ Failed to load ONNX model', err);
                setError(err.message);
            }
        })();

        return () => {
            worker.terminate();
        };
    }, []);

    // 🖐️ Initialize MediaPipe Hands
    useEffect(() => {
        if (!videoRef.current) return;
        let isActive = true;

        const videoElement = videoRef.current;

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
            if (!isActive) return; // 🚫 Ignore after cleanup
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const w = canvas.width;
            const h = canvas.height;

            ctx.save();
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(results.image ?? videoElement, 0, 0, w, h);

            if (results.multiHandLandmarks?.length) {
                setDetectedHand(true);
                const landmarks = results.multiHandLandmarks[0];
                drawConnectors(ctx, landmarks, w, h);
                drawLandmarks(ctx, landmarks, w, h);

                if (modelReady && workerRef.current) {
                    const features = extractFeatures(landmarks);
                    workerRef.current.postMessage({
                        type: "infer",
                        data: { landmarks: features },
                    });
                }
            } else {
                setDetectedHand(false);
                setPrediction(null);
            }

            ctx.restore();
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                if (!isActive) return;
                try {
                    await hands.send({ image: videoElement });
                } catch (err: any) {
                    if (
                        err?.message?.includes("deleted object") ||
                        err?.message?.includes("SolutionWasm")
                    ) {
                        // 🔇 Ignore harmless race-condition errors
                        return;
                    } else {
                        console.warn("Unexpected Hands error:", err);
                    }
                }
            },
            width: 640,
            height: 480,
        });

        camera.start();
        setHandsReady(true);
        console.log("✅ Camera initialized");

        handsRef.current = hands;

        return () => {
            console.log("🧹 Cleaning up MediaPipe...");
            isActive = false;

            // ✅ Stop camera first, then close hands
            camera.stop();

            // Small delay ensures no more onFrame() calls in flight
            setTimeout(() => {
                hands.close();
            }, 100);
        };
    }, [modelReady]);


    // 🧮 Extract features
    const extractFeatures = (landmarks: NormalizedLandmarkList): Float32Array => {
        const features: number[] = [];
        for (const l of landmarks) features.push(l.x, l.y, l.z);
        return new Float32Array(features);
    };

    const drawConnectors = (
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmarkList,
        w: number,
        h: number
    ) => {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
            const s = landmarks[startIdx];
            const e = landmarks[endIdx];
            ctx.beginPath();
            ctx.moveTo(s.x * w, s.y * h);
            ctx.lineTo(e.x * w, e.y * h);
            ctx.stroke();
        }
    };

    const drawLandmarks = (
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmarkList,
        w: number,
        h: number
    ) => {
        ctx.fillStyle = '#FF0000';
        for (const l of landmarks) {
            ctx.beginPath();
            ctx.arc(l.x * w, l.y * h, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    };

    if (error) {
        return (
            <div className="app error-container">
                <h1>❌ Error</h1>
                <p>{error}</p>
                <p>Make sure landmark_model.onnx and landmark_classes.json are in the public folder.</p>
            </div>
        );
    }

    return (
        <div className="app">
            <header>
                <h1>🤟 Sign Language Recognition</h1>
                <div className="status">
                    <span className={modelReady ? 'ready' : 'loading'}>
                        Model: {modelReady ? '✅ Ready' : '⏳ Loading...'}
                    </span>
                    <span className={handsReady ? 'ready' : 'loading'}>
                        Camera: {handsReady ? '✅ Ready' : '⏳ Loading...'}
                    </span>
                </div>
            </header>

            <main>
                <div className="video-container">
                    <video ref={videoRef} style={{ display: 'none' }} />
                    <canvas ref={canvasRef} width={640} height={480} />
                </div>

                <div className="info-panel">
                    {detectedHand && prediction && (
                        <div className="prediction-box">
                            <div className="prediction-label">{prediction.label}</div>
                            <div className="prediction-stats">
                                <div className="stat">
                                    <span className="stat-label">Confidence:</span>
                                    <span className="stat-value">{(prediction.confidence * 100).toFixed(1)}%</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Inference:</span>
                                    <span className="stat-value">{prediction.inferenceTime.toFixed(2)}ms</span>
                                </div>
                            </div>
                            <div className="confidence-bar">
                                <div className="confidence-fill" style={{ width: `${prediction.confidence * 100}%` }} />
                            </div>
                        </div>
                    )}

                    {!detectedHand && handsReady && modelReady && (
                        <div className="no-hand">
                            <span>👋</span>
                            <p>Show your hand to start</p>
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <p>Powered by MediaPipe Hands + ONNX Runtime Web</p>
            </footer>
        </div>
    );
}

export default App;
