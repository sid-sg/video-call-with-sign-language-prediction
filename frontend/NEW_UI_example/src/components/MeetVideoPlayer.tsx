import React, { useRef, useEffect, useState } from "react";
import { User } from "lucide-react";

interface VideoPlayerProps {
  stream?: MediaStream | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  label: string;
  muted?: boolean;
  isVideoEnabled?: boolean;
  isLocal?: boolean;
  isPrimary?: boolean;
}

export const MeetVideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  videoRef,
  label,
  muted = false,
  isVideoEnabled = true,
  isLocal = false,
  isPrimary = false,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const activeRef = videoRef ?? internalVideoRef;

  // Attach stream to local video
  useEffect(() => {
    if (stream && internalVideoRef.current) {
      internalVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Monitor stream readiness
  useEffect(() => {
    const video = activeRef.current;
    if (!video) return;
    const check = () => {
      const active =
        !!video.srcObject &&
        video.readyState >= video.HAVE_METADATA &&
        video.videoWidth > 0;
      if (active !== hasStream) setHasStream(active);
      if (active && video.paused) video.play().catch(() => {});
    };
    check();
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, [activeRef, hasStream]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${
        isPrimary ? "flex-1" : ""
      } bg-surface-video`}
    >
      {/* Video */}
      <video
        ref={isLocal ? internalVideoRef : videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${
          isLocal ? "scale-x-[-1]" : ""
        } ${!isVideoEnabled ? "hidden" : ""}`}
      />

      {/* Camera Off Placeholder */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-video">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-3">
            <User size={40} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
        </div>
      )}

      {/* Loading */}
      {isVideoEnabled && !hasStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-video">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center animate-pulse">
            <User size={40} className="text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Name Label - bottom left like GMeet */}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="bg-background/70 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-md">
          {label}
        </span>
      </div>

      {/* Mic indicator - bottom right like GMeet */}
      <div className="absolute bottom-3 right-3 z-10">
        <div className="w-7 h-7 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
          {/* This would show mic status - static for demo */}
        </div>
      </div>
    </div>
  );
};
