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
    onTextUpdate: (text: string) => void;
}

interface Frame {
    label: string | null;
    confidence: number;
    timestamp: number;
    handDetected: boolean;
}

// --- FIXED TUNING (Option A) ---
const SPACE_PAUSE_MS = 700; // insert space after 700ms hand absence
const SAME_LETTER_LOCK_MS = 1500; // block same-letter repeats for 1500ms
const LETTER_STABILITY_MS = 300; // require 300ms stability for a letter
const WINDOW_TIME_MS = 900; // keep ~900ms of frames in window (good for 25-30fps)
const BUFFER_SIZE = 15; // keep up to 15 frames
const REQUIRED_STABILITY = 9; // require 9/15 frames
const CONFIDENCE_THRESHOLD = 0.85; // average confidence threshold



export function useSignSentenceBuilder({
    prediction,
    handDetected,
    enabled,
    onTextUpdate,
}: UseSignSentenceBuilderProps) {
    const [currentLetter, setCurrentLetter] = useState<string | null>(null);

    const slidingWindowRef = useRef<Frame[]>([]);

    const lastConfirmedLetterRef = useRef<string | null>(null);
    const lastConfirmedTimeRef = useRef<number>(0);
    const lockUntilRef = useRef<number>(0); // timestamp until which same letter is blocked

    const handLostStartRef = useRef<number | null>(null);
    const spaceInsertedRef = useRef(false);

    const internalTextRef = useRef('');

    const letterStabilityStartRef = useRef<Map<string, number>>(new Map());

    const isReallyNoHand =
        !handDetected ||
        (prediction?.confidence ?? 0) < 0.30 ||
        slidingWindowRef.current.filter(f => f.handDetected).length === 0;


    // Reset when disabled
    useEffect(() => {
        if (!enabled) {
            setCurrentLetter(null);
            slidingWindowRef.current = [];
            lastConfirmedLetterRef.current = null;
            lastConfirmedTimeRef.current = 0;
            lockUntilRef.current = 0;
            handLostStartRef.current = null;
            spaceInsertedRef.current = false;
            internalTextRef.current = '';
            letterStabilityStartRef.current.clear();
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        const now = Date.now();

        // Build frame for this tick
        const frame: Frame = {
            label: handDetected && prediction ? prediction.label : null,
            confidence: handDetected && prediction ? prediction.confidence : 0,
            timestamp: now,
            handDetected,
        };

        slidingWindowRef.current.push(frame);

        // Keep only last WINDOW_TIME_MS and BUFFER_SIZE frames
        slidingWindowRef.current = slidingWindowRef.current
            .filter(f => now - f.timestamp <= WINDOW_TIME_MS)
            .slice(-BUFFER_SIZE);

        // ---- SPACE LOGIC (independent of sliding window) ----
        // if (!handDetected) {
        if (isReallyNoHand) {
            setCurrentLetter(null);
            // Start hand-lost timer
            if (handLostStartRef.current === null) {
                handLostStartRef.current = now;
            }

            const lostDuration = now - (handLostStartRef.current || now);

            if (
                lostDuration >= SPACE_PAUSE_MS &&
                !spaceInsertedRef.current &&
                internalTextRef.current.length > 0 &&
                !internalTextRef.current.endsWith(' ')
            ) {
                // Insert a space
                internalTextRef.current += ' ';
                onTextUpdate(internalTextRef.current);
                spaceInsertedRef.current = true;

                // Allow same letter again after space: reset lastConfirmed
                lastConfirmedLetterRef.current = null;
                lastConfirmedTimeRef.current = 0;
                lockUntilRef.current = 0;
            }

            // Do not process letter detection when hand not detected
            return;
        }

        // Hand detected: reset hand-lost tracking
        if (handLostStartRef.current !== null) {
            const pauseDuration = now - handLostStartRef.current;
            // If pause was very short, allow space insertion reset
            if (pauseDuration < 200) {
                spaceInsertedRef.current = false;
            }
            handLostStartRef.current = null;
        }

        // Reset spaceInserted when hand present (so subsequent pauses can produce spaces)
        // but only if the user is actively signing (we'll also reset after confirmation)
        // keep spaceInsertedRef as-is otherwise

        // ---- ANALYZE SLIDING WINDOW FOR LETTER STABILITY ----
        const handFrames = slidingWindowRef.current.filter(f => f.handDetected && f.label);
        if (handFrames.length === 0) {
            setCurrentLetter(null);
            return;
        }

        // Count occurrences and collect confidences
        const letterCounts = new Map<string, number>();
        const letterConfidences = new Map<string, number[]>();

        handFrames.forEach(f => {
            if (!f.label) return;
            letterCounts.set(f.label, (letterCounts.get(f.label) || 0) + 1);
            if (!letterConfidences.has(f.label)) letterConfidences.set(f.label, []);
            letterConfidences.get(f.label)!.push(f.confidence);
        });

        // Determine most frequent letter
        let mostFrequentLetter: string | null = null;
        let maxCount = 0;
        letterCounts.forEach((count, letter) => {
            if (count > maxCount) {
                maxCount = count;
                mostFrequentLetter = letter;
            }
        });

        if (!mostFrequentLetter) {
            setCurrentLetter(null);
            return;
        }

        // Mark first seen time for stability
        if (!letterStabilityStartRef.current.has(mostFrequentLetter)) {
            letterStabilityStartRef.current.set(mostFrequentLetter, now);
        }

        // Remove entries for non-dominant letters
        const toRemove: string[] = [];
        letterStabilityStartRef.current.forEach((_, l) => {
            if (l !== mostFrequentLetter) toRemove.push(l);
        });
        toRemove.forEach(l => letterStabilityStartRef.current.delete(l));

        const confidences = letterConfidences.get(mostFrequentLetter) || [];
        const avgConfidence = confidences.reduce((s, v) => s + v, 0) / confidences.length;

        const noiseCount = handFrames.filter(f => f.confidence < CONFIDENCE_THRESHOLD).length;
        const uniqueLabels = letterCounts.size;
        const hasInstability = uniqueLabels > 2;

        const last3 = handFrames.slice(-3);
        const last3AllSame = last3.length >= 3 && last3.every(f => f.label === mostFrequentLetter);

        const firstSeen = letterStabilityStartRef.current.get(mostFrequentLetter) || now;
        const stabilityDuration = now - firstSeen;

        const isStable =
            maxCount >= REQUIRED_STABILITY &&
            avgConfidence >= CONFIDENCE_THRESHOLD &&
            noiseCount <= 2 &&
            !hasInstability &&
            (last3.length < 3 || last3AllSame) &&
            stabilityDuration >= LETTER_STABILITY_MS;

        // UI feedback: show candidate earlier but not guaranteed stable
        if (maxCount >= Math.floor(REQUIRED_STABILITY * 0.6)) {
            setCurrentLetter(mostFrequentLetter);
        } else {
            setCurrentLetter(null);
        }

        // ---- CONFIRM LETTER if stable ----
        if (isStable) {
            // Prevent rapid re-adding of the same letter
            const nowLock = lockUntilRef.current;
            const lastConfirmed = lastConfirmedLetterRef.current;

            if (mostFrequentLetter === lastConfirmed && now < nowLock) {
                // blocked by lock; ignore
                return;
            }

            // Append letter
            internalTextRef.current += mostFrequentLetter;
            onTextUpdate(internalTextRef.current);

            lastConfirmedLetterRef.current = mostFrequentLetter;
            lastConfirmedTimeRef.current = now;
            lockUntilRef.current = now + SAME_LETTER_LOCK_MS;

            // After confirming, clear sliding window and stability tracker but
            // keep spaceInserted as false so a following pause can insert a space.
            slidingWindowRef.current = [];
            letterStabilityStartRef.current.clear();
            spaceInsertedRef.current = false;
        }

    }, [prediction, handDetected, enabled, onTextUpdate]);

    // Sync internal text when external text changes (e.g., user types manually)
    // Option 1 behavior: if user deletes characters manually (text length shrinks), reset locks
    const syncText = useCallback((newText: string) => {
        const prev = internalTextRef.current;
        internalTextRef.current = newText;

        // If user shortened text, assume manual deletion -> reset repeating locks
        if (newText.length < prev.length) {
            lastConfirmedLetterRef.current = null;
            lastConfirmedTimeRef.current = 0;
            lockUntilRef.current = 0;
        }
    }, []);

    const clearText = useCallback(() => {
        internalTextRef.current = '';
        setCurrentLetter(null);
        slidingWindowRef.current = [];
        lastConfirmedLetterRef.current = null;
        lastConfirmedTimeRef.current = 0;
        lockUntilRef.current = 0;
        spaceInsertedRef.current = false;
        handLostStartRef.current = null;
        letterStabilityStartRef.current.clear();
        onTextUpdate('');
    }, [onTextUpdate]);

    const getBufferStatus = useCallback(() => {
        const handFrames = slidingWindowRef.current.filter(f => f.handDetected && f.label);
        if (handFrames.length === 0) return null;

        const letterCounts = new Map<string, number>();
        const letterConfs = new Map<string, number[]>();

        handFrames.forEach(f => {
            if (!f.label) return;
            letterCounts.set(f.label, (letterCounts.get(f.label) || 0) + 1);
            if (!letterConfs.has(f.label)) letterConfs.set(f.label, []);
            letterConfs.get(f.label)!.push(f.confidence);
        });

        return Array.from(letterCounts.entries()).map(([letter, count]) => {
            const confs = letterConfs.get(letter) || [];
            const avg = confs.reduce((s, v) => s + v, 0) / confs.length;
            return {
                letter,
                count,
                percentage: (count / BUFFER_SIZE) * 100,
                avgConfidence: (avg * 100).toFixed(1),
            };
        }).sort((a, b) => b.count - a.count);
    }, []);

    return {
        currentLetter,
        clearText,
        syncText,
        getBufferStatus,
    } as const;
}
