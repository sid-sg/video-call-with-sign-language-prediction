import { useEffect, useRef, useState, useCallback } from 'react';

interface Prediction {
    label: string;
    confidence: number;
    inferenceTime: number;
}

interface UseSignSentenceBuilderProps {
    prediction: Prediction | null;
    handDetected: boolean;
    enabled: boolean;
    onTextUpdate: (text: string) => void; // Callback to update chat input
    confidenceThreshold?: number;
    bufferSize?: number;
    requiredStability?: number;
    spacePauseMs?: number;
}

interface PredictionBuffer {
    label: string;
    confidence: number;
    timestamp: number;
}

export function useSignSentenceBuilder({
    prediction,
    handDetected,
    enabled,
    onTextUpdate,
    confidenceThreshold = 0.8,
    bufferSize = 8,
    requiredStability = 6,
    spacePauseMs = 600,
}: UseSignSentenceBuilderProps) {
    // Visual feedback for current stable letter
    const [currentLetter, setCurrentLetter] = useState<string | null>(null);
    
    // Rolling buffer of recent predictions
    const predictionBufferRef = useRef<PredictionBuffer[]>([]);
    
    // Track last confirmed letter to avoid duplicates
    const lastConfirmedLetterRef = useRef<string | null>(null);
    
    // Track last hand detection time for space insertion
    const lastHandDetectedTimeRef = useRef<number>(Date.now());
    
    // Track if we already inserted a space after pause
    const spaceInsertedRef = useRef(false);

    // Internal text state to track what we've added
    const internalTextRef = useRef('');

    // Reset everything when disabled
    useEffect(() => {
        if (!enabled) {
            setCurrentLetter(null);
            predictionBufferRef.current = [];
            lastConfirmedLetterRef.current = null;
            lastHandDetectedTimeRef.current = Date.now();
            spaceInsertedRef.current = false;
            internalTextRef.current = '';
        }
    }, [enabled]);

    // Main processing effect
    useEffect(() => {
        if (!enabled) return;

        const now = Date.now();

        // Handle hand not detected - space insertion logic
        if (!handDetected) {
            setCurrentLetter(null);
            
            // Check if enough time has passed for a space
            const timeSinceLastHand = now - lastHandDetectedTimeRef.current;
            
            if (timeSinceLastHand > spacePauseMs && 
                !spaceInsertedRef.current && 
                internalTextRef.current.length > 0 && 
                !internalTextRef.current.endsWith(' ')) {
                
                console.log('⏸️ Inserting space after pause');
                internalTextRef.current += ' ';
                onTextUpdate(internalTextRef.current);
                spaceInsertedRef.current = true;
                lastConfirmedLetterRef.current = null; // Reset to allow same letter after space
            }
            
            return;
        }

        // Hand is detected
        lastHandDetectedTimeRef.current = now;
        spaceInsertedRef.current = false; // Reset space flag when hand returns

        // Only process if we have a valid prediction
        if (!prediction || prediction.confidence < confidenceThreshold) {
            return;
        }

        // Add to rolling buffer
        predictionBufferRef.current.push({
            label: prediction.label,
            confidence: prediction.confidence,
            timestamp: now,
        });

        // Keep only recent predictions (buffer size)
        if (predictionBufferRef.current.length > bufferSize) {
            predictionBufferRef.current.shift();
        }

        // Remove predictions older than 1 second
        predictionBufferRef.current = predictionBufferRef.current.filter(
            p => now - p.timestamp < 1000
        );

        // Count occurrences of each letter in buffer
        const letterCounts = new Map<string, number>();
        predictionBufferRef.current.forEach(p => {
            letterCounts.set(p.label, (letterCounts.get(p.label) || 0) + 1);
        });

        // Find the most frequent letter
        let mostFrequentLetter: string | null = null;
        let maxCount = 0;

        letterCounts.forEach((count, letter) => {
            if (count > maxCount) {
                maxCount = count;
                mostFrequentLetter = letter;
            }
        });

        // Check if letter is stable enough to confirm
        if (mostFrequentLetter && maxCount >= requiredStability) {
            setCurrentLetter(mostFrequentLetter);

            // Only add if it's different from last confirmed letter
            if (mostFrequentLetter !== lastConfirmedLetterRef.current) {
                console.log(`✅ Confirmed letter: ${mostFrequentLetter} (${maxCount}/${bufferSize} frames)`);
                
                internalTextRef.current += mostFrequentLetter;
                onTextUpdate(internalTextRef.current);
                lastConfirmedLetterRef.current = mostFrequentLetter;
                
                // Clear buffer after confirmation to avoid re-adding
                predictionBufferRef.current = [];
            }
        } else if (mostFrequentLetter) {
            // Show current letter but not stable yet
            setCurrentLetter(mostFrequentLetter);
        }

    }, [prediction, handDetected, enabled, confidenceThreshold, bufferSize, requiredStability, spacePauseMs, onTextUpdate]);

    // Sync internal text when external text changes (e.g., user types manually)
    const syncText = useCallback((newText: string) => {
        internalTextRef.current = newText;
    }, []);

    // Manual control functions
    const clearText = useCallback(() => {
        internalTextRef.current = '';
        setCurrentLetter(null);
        predictionBufferRef.current = [];
        lastConfirmedLetterRef.current = null;
        spaceInsertedRef.current = false;
        onTextUpdate('');
    }, [onTextUpdate]);

    // Get buffer status for debugging/UI
    const getBufferStatus = useCallback(() => {
        if (predictionBufferRef.current.length === 0) return null;
        
        const letterCounts = new Map<string, number>();
        predictionBufferRef.current.forEach(p => {
            letterCounts.set(p.label, (letterCounts.get(p.label) || 0) + 1);
        });

        return Array.from(letterCounts.entries()).map(([letter, count]) => ({
            letter,
            count,
            percentage: (count / bufferSize) * 100,
        })).sort((a, b) => b.count - a.count);
    }, [bufferSize]);

    return {
        currentLetter,
        clearText,
        syncText,
        getBufferStatus,
    };
}