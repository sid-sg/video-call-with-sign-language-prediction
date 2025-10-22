import type { RefObject } from 'react';

interface VideoPlayerProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    label: string;
    muted?: boolean;
    isVideoEnabled?: boolean;
    isLocal: boolean;
}

export const VideoPlayer = ({
    videoRef,
    label,
    muted = false,
    isVideoEnabled = true,
    isLocal
}: VideoPlayerProps) => {
    return (
        <div className="relative">
            <h3 className="text-lg font-semibold mb-2">{label}</h3>
            <div className="relative w-80 h-60 bg-black rounded border border-gray-300 overflow-hidden">
                {isLocal && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={muted}
                        className="transform -scale-x-100 w-full h-full object-cover"
                    />
                )}
                {!isLocal && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={muted}
                        className="w-full h-full object-cover"
                    />
                )}

                {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <span className="text-white text-sm">Video Off</span>
                    </div>
                )}
            </div>
        </div>
    );
};
