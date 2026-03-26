import React from "react";
import { Hand } from "lucide-react";

interface SignAssistPanelProps {
  handDetected: boolean;
  currentLetter: string | null;
  currentPrediction: {
    label: string;
    confidence: number;
    inferenceTime: number;
  } | null;
  bufferStatus?: { letter: string; count: number; percentage: number }[] | null;
}

export const MeetSignAssistPanel: React.FC<SignAssistPanelProps> = ({
  handDetected,
  currentLetter,
  currentPrediction,
  bufferStatus,
}) => {
  return (
    <div className="absolute top-3 right-3 z-20 w-64 animate-fade-in">
      <div
        className="bg-card-95 backdrop-blur-md rounded-lg border border-border overflow-hidden"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Hand size={14} className="text-gmeet-green" />
          <span className="text-xs font-medium text-foreground">Sign Assist</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-gmeet-green animate-pulse-dot" />
        </div>

        {/* Detection */}
        <div className="p-3">
          {handDetected && currentLetter ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gmeet-green-20 flex items-center justify-center">
                <span className="text-2xl font-bold text-gmeet-green">
                  {currentLetter}
                </span>
              </div>
              {currentPrediction && (
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <span className="text-xs font-medium text-foreground">
                      {(currentPrediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gmeet-green transition-all duration-300"
                      style={{ width: `${currentPrediction.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentPrediction.inferenceTime.toFixed(0)}ms
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-lg">👋</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Show your hand to start signing
              </p>
            </div>
          )}

          {/* Buffer */}
          {bufferStatus && bufferStatus.length > 0 && (
            <div className="flex gap-1 mt-2">
              {bufferStatus.slice(0, 3).map(({ letter, percentage }) => (
                <span
                  key={letter}
                  className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground"
                >
                  {letter}: {percentage.toFixed(0)}%
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
