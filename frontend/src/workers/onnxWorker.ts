import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = '/onnx-wasm/';

let session: ort.InferenceSession | null = null;
let classMapping: Record<string, number> = {};

self.onmessage = async (event) => {
    const { type, data } = event.data;

    if (type === 'init') {
        try {
            const { modelBuffer, classData } = data;
            classMapping = classData;

            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm'], 
                graphOptimizationLevel: 'all',
            });

            self.postMessage({ type: 'ready' });
        } catch (err: any) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }

    if (type === 'infer') {
        if (!session) {
            return;
        }

        const { landmarks } = data;
        const start = performance.now();

        const input = new ort.Tensor('float32', landmarks, [1, 63]);
        const outputs = await session.run({ input });

        const outputTensor = outputs[Object.keys(outputs)[0]];
        const logits = Array.from(outputTensor.data as Float32Array);

        const maxLogit = Math.max(...logits);
        const expScores = logits.map(x => Math.exp(x - maxLogit));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        const probabilities = expScores.map(x => x / sumExp);

        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[maxIndex];

        const idxToClass = Object.fromEntries(
            Object.entries(classMapping).map(([k, v]) => [v, k])
        );
        const label = idxToClass[maxIndex];

        const inferenceTime = performance.now() - start;

        self.postMessage({
            type: 'result',
            result: { label, confidence, inferenceTime },
        });
    }
};


// import * as ort from 'onnxruntime-web';

// declare const self: DedicatedWorkerGlobalScope & typeof globalThis;

// ort.env.wasm.wasmPaths = '/onnx-wasm/'; // IMPORTANT: where your .wasm files live
// ort.env.logLevel = 'warning'; // lower noise; set to 'verbose' for more info

// let session: ort.InferenceSession | null = null;
// let classMapping: Record<string, number> = {};

// self.onmessage = async (event: MessageEvent) => {
//     const { type, data } = event.data;

//     try {
//         if (type === 'init') {
//             // Expect data.modelBuffer (ArrayBuffer transferred) and data.classData (JSON)
//             const { modelBuffer, classData } = data;
//             console.log('[Worker] init received. modelBuffer bytes:', modelBuffer?.byteLength);

//             classMapping = classData || {};
//             // create session from ArrayBuffer
//             session = await ort.InferenceSession.create(modelBuffer, {
//                 executionProviders: ['wasm'], // choose 'wasm' to avoid WebGL context conflicts with mediapipe
//                 graphOptimizationLevel: 'all',
//             });

//             console.log('[Worker] session created. outputNames:', session.outputNames);
//             self.postMessage({ type: 'ready' });
//             return;
//         }

//         if (type === 'infer') {
//             if (!session) {
//                 self.postMessage({ type: 'error', error: 'Model not loaded' });
//                 return;
//             }
//             console.log("[Worker] infer received, input shape:", data.landmarks.length);

//             // We expect transferred ArrayBuffer in data.landmarks and data.length
//             const arrBuffer: ArrayBuffer = data.landmarks;
//             const len: number = data.length;
//             if (!arrBuffer) {
//                 self.postMessage({ type: 'error', error: 'No landmarks buffer received' });
//                 return;
//             }

//             const features = new Float32Array(arrBuffer, 0, len);
//             console.log('[Worker] infer received. features length:', features.length);

//             const inputTensor = new ort.Tensor('float32', features, [1, features.length]);

//             const t0 = performance.now();
//             const outputs = await session.run({ input: inputTensor });
//             const t1 = performance.now();

//             // find the first output tensor in outputs
//             const outKeys = Object.keys(outputs);
//             if (outKeys.length === 0) {
//                 self.postMessage({ type: 'error', error: 'No outputs from model' });
//                 return;
//             }
//             const outTensor = outputs[outKeys[0]] as ort.Tensor;
//             const scores = Array.from(outTensor.data as Float32Array);

//             const maxIdx = scores.indexOf(Math.max(...scores));
//             // classMapping is assumed { label: index }, invert it
//             const idxToLabel: Record<number, string> = {};
//             for (const [label, idx] of Object.entries(classMapping)) {
//                 idxToLabel[idx as unknown as number] = label;
//             }

//             const label = idxToLabel[maxIdx] ?? 'Unknown';
//             const confidence = scores[maxIdx];

//             const inferenceTime = t1 - t0;

//             // send back result
//             self.postMessage({
//                 type: 'result',
//                 result: { label, confidence, inferenceTime }
//             });
//             return;
//         }
//     } catch (err: any) {
//         console.error('[Worker] caught error:', err);
//         self.postMessage({ type: 'error', error: (err && err.message) ? err.message : String(err) });
//     }
// };
