import React from 'react';

interface SignLanguageOverlayProps {
    prediction: { label: string; confidence: number; inferenceTime: number } | null;
    detectedHand: boolean;
    modelReady: boolean;
}

export const SignLanguageOverlay: React.FC<SignLanguageOverlayProps> = ({
    prediction,
    detectedHand,
    modelReady
}) => {
    if (!modelReady) {
        return (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded text-xs font-semibold">
                ⏳ Loading Model...
            </div>
        );
    }

    if (!detectedHand || !prediction) {
        return null;
    }

    return (
        <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white p-3 rounded-lg shadow-lg">
            <div className="text-2xl font-bold mb-2">{prediction.label}</div>
            <div className="text-xs space-y-1 text-gray-300">
                <div>Confidence: {(prediction.confidence * 100).toFixed(1)}%</div>
                <div>Time: {prediction.inferenceTime.toFixed(1)}ms</div>
            </div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${prediction.confidence * 100}%` }}
                />
            </div>
        </div>
    );
};