import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = '/onnx-wasm/';

let session: ort.InferenceSession | null = null;
let classMapping: Record<string, number> = {};

self.onmessage = async (event) => {
    const { type, data } = event.data;

    // ✅ Match 'init' instead of 'load'
    if (type === 'init') {
        try {
            const { modelBuffer, classData } = data;
            classMapping = classData;

            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm'], // You can switch to ['webgl'] later
                graphOptimizationLevel: 'all',
            });

            self.postMessage({ type: 'ready' });
        } catch (err: any) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }

    if (type === 'infer' && session) {
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
