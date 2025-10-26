import { useRef, useState, useCallback, useEffect } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import type { Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import * as ort from 'onnxruntime-web';
import './App.css';


ort.env.wasm.wasmPaths = '/onnx-wasm/';

interface Prediction {
    label: string;
    confidence: number;
    inferenceTime: number;
}

interface ClassMapping {
    [key: string]: number;
}

function App() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [detectedHand, setDetectedHand] = useState(false);
    const [handsReady, setHandsReady] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<ort.InferenceSession | null>(null);
    const classesRef = useRef<ClassMapping>({});
    const handsRef = useRef<Hands | null>(null);

    // Load ONNX Model
    useEffect(() => {
        async function loadModel() {
            try {

                // Load class mappings
                const classesResponse = await fetch('/landmark_classes.json');
                const classData = await classesResponse.json();
                classesRef.current = classData;

                // Load ONNX model
                const session = await ort.InferenceSession.create('/landmark_model.onnx', {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'all'
                });
                sessionRef.current = session;

                setModelReady(true);
                console.log('✅ Model loaded successfully');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load model');
                console.error('❌ Error loading model:', err);
            }
        }

        loadModel();
    }, []);

    // Initialize MediaPipe Hands
    useEffect(() => {
        if (!videoRef.current) return;

        const videoElement = videoRef.current;

        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
        });

        // Define onResults inline to avoid dependency issues
        hands.onResults((results: Results) => {
            if (!canvasRef.current) {
                console.log('⚠️ Canvas not ready');
                return;
            }

            const canvasCtx = canvasRef.current.getContext('2d');
            if (!canvasCtx) {
                console.log('⚠️ Canvas context not available');
                return;
            }

            const canvasWidth = canvasRef.current.width;
            const canvasHeight = canvasRef.current.height;

            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            // Draw the video frame
            if (results.image) {
                canvasCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight);
            } else if (videoElement) {
                canvasCtx.drawImage(videoElement, 0, 0, canvasWidth, canvasHeight);
            }

            // Process hand landmarks
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                setDetectedHand(true);
                const landmarks = results.multiHandLandmarks[0];

                drawConnectors(canvasCtx, landmarks, canvasWidth, canvasHeight);
                drawLandmarks(canvasCtx, landmarks, canvasWidth, canvasHeight);

                if (modelReady && sessionRef.current) {
                    try {
                        const features = extractFeatures(landmarks);
                        predict(features).then(pred => setPrediction(pred));
                    } catch (err) {
                        console.error('Prediction error:', err);
                    }
                }
            } else {
                setDetectedHand(false);
                setPrediction(null);
            }

            canvasCtx.restore();
        });

        handsRef.current = hands;

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                if (videoElement && handsRef.current) {
                    await handsRef.current.send({ image: videoElement });
                }
            },
            width: 640,
            height: 480,
        });

        camera.start();
        setHandsReady(true);
        console.log('✅ Camera initialized');

        return () => {
            camera.stop();
            hands.close();
        };
    }, [modelReady]);

    // Extract features from landmarks
    const extractFeatures = (landmarks: NormalizedLandmarkList): Float32Array => {
        const features: number[] = [];
        for (const landmark of landmarks) {
            features.push(landmark.x, landmark.y, landmark.z);
        }
        return new Float32Array(features);
    };

    // Predict function
    const predict = async (features: Float32Array): Promise<Prediction> => {
        if (!sessionRef.current) throw new Error('Model not loaded');

        const startTime = performance.now();

        const inputTensor = new ort.Tensor('float32', features, [1, 63]);
        const outputs = await sessionRef.current.run({ input: inputTensor });

        // Get the output tensor - it might be named 'output' or something else
        const outputTensor = outputs[Object.keys(outputs)[0]];
        const logits = Array.from(outputTensor.data as Float32Array);

        // Softmax
        const maxLogit = Math.max(...logits);
        const expScores = logits.map(x => Math.exp(x - maxLogit));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        const probabilities = expScores.map(x => x / sumExp);

        // Get prediction
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[maxIndex];

        // Get label
        const idxToClass = Object.fromEntries(
            Object.entries(classesRef.current).map(([k, v]) => [v, k])
        );
        const label = idxToClass[maxIndex];

        const inferenceTime = performance.now() - startTime;

        return { label, confidence, inferenceTime };
    };

    // Draw landmarks
    const drawConnectors = (
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmarkList,
        width: number,
        height: number
    ) => {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;

        for (const connection of HAND_CONNECTIONS) {
            const [startIdx, endIdx] = connection;
            const start = landmarks[startIdx];
            const end = landmarks[endIdx];

            ctx.beginPath();
            ctx.moveTo(start.x * width, start.y * height);
            ctx.lineTo(end.x * width, end.y * height);
            ctx.stroke();
        }
    };

    const drawLandmarks = (
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmarkList,
        width: number,
        height: number
    ) => {
        ctx.fillStyle = '#FF0000';

        for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(
                landmark.x * width,
                landmark.y * height,
                5,
                0,
                2 * Math.PI
            );
            ctx.fill();
        }
    };

    // Handle MediaPipe results
    const onResults = useCallback(async (results: Results) => {
        if (!canvasRef.current) {
            console.log('⚠️ Canvas not ready');
            return;
        }

        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) {
            console.log('⚠️ Canvas context not available');
            return;
        }

        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw the video frame (image property from MediaPipe results)
        if (results.image) {
            canvasCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight);
            console.log('✅ Drawing from results.image');
        } else if (videoRef.current) {
            // Fallback: draw directly from video element
            canvasCtx.drawImage(videoRef.current, 0, 0, canvasWidth, canvasHeight);
            console.log('✅ Drawing from video element');
        } else {
            console.log('⚠️ No video source available');
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && modelReady) {
            setDetectedHand(true);
            const landmarks = results.multiHandLandmarks[0];

            drawConnectors(canvasCtx, landmarks, canvasWidth, canvasHeight);
            drawLandmarks(canvasCtx, landmarks, canvasWidth, canvasHeight);

            try {
                const features = extractFeatures(landmarks);
                const pred = await predict(features);
                setPrediction(pred);
            } catch (err) {
                console.error('Prediction error:', err);
            }
        } else {
            setDetectedHand(false);
            setPrediction(null);
        }

        canvasCtx.restore();
    }, [modelReady]);

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
                                    <span className="stat-value">
                                        {(prediction.confidence * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Inference:</span>
                                    <span className="stat-value">
                                        {prediction.inferenceTime.toFixed(2)}ms
                                    </span>
                                </div>
                            </div>
                            <div className="confidence-bar">
                                <div
                                    className="confidence-fill"
                                    style={{ width: `${prediction.confidence * 100}%` }}
                                />
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
                <p>Powered by MediaPipe Hands + ONNX Runtime</p>
            </footer>
        </div>
    );
}

export default App;