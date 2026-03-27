import { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Hand, PhoneOff, MessageSquare, MonitorUp, MonitorOff, Volume2 } from 'lucide-react';
import type { MediaControls as MediaControlsType } from '../types/webrtc.types';

interface MediaControlsProps {
    controls: MediaControlsType;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
    onEndCall?: () => void;
    signAssistEnabled?: boolean;
    onToggleSignAssist?: () => void;
    onToggleChat?: () => void;
    isChatOpen?: boolean;
    // Screen share props
    isScreenSharing?: boolean;
    onStartScreenShare?: (withAudio: boolean) => void;
    onStopScreenShare?: () => void;
    peerIsSharing?: boolean;
}

export const MediaControls = ({
    controls,
    onToggleVideo,
    onToggleAudio,
    onEndCall,
    signAssistEnabled = false,
    onToggleSignAssist,
    onToggleChat,
    isChatOpen = false,
    isScreenSharing = false,
    onStartScreenShare,
    onStopScreenShare,
    peerIsSharing = false,
}: MediaControlsProps) => {
    const [showShareDropdown, setShowShareDropdown] = useState(false);
    const [shareAudio, setShareAudio] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowShareDropdown(false);
            }
        };
        if (showShareDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showShareDropdown]);

    const handleScreenShareClick = () => {
        if (isScreenSharing) {
            onStopScreenShare?.();
        } else {
            setShowShareDropdown(!showShareDropdown);
        }
    };

    const handleStartShare = () => {
        setShowShareDropdown(false);
        onStartScreenShare?.(shareAudio);
    };

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3">
            {/* Mic */}
            <button
                onClick={onToggleAudio}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${controls.audio
                        ? 'bg-secondary hover:bg-secondary-80'
                        : 'bg-destructive hover:bg-destructive-90'
                    }`}
                title={controls.audio ? 'Mute' : 'Unmute'}
            >
                {controls.audio ? (
                    <Mic size={20} className="text-foreground" />
                ) : (
                    <MicOff size={20} className="text-destructive-foreground" />
                )}
            </button>

            {/* Camera */}
            <button
                onClick={onToggleVideo}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${controls.video
                        ? 'bg-secondary hover:bg-secondary-80'
                        : 'bg-destructive hover:bg-destructive-90'
                    }`}
                title={controls.video ? 'Turn off camera' : 'Turn on camera'}
            >
                {controls.video ? (
                    <Video size={20} className="text-foreground" />
                ) : (
                    <VideoOff size={20} className="text-destructive-foreground" />
                )}
            </button>

            {/* Screen Share */}
            {(onStartScreenShare || onStopScreenShare) && (
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={handleScreenShareClick}
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${isScreenSharing
                                ? 'bg-gmeet-blue hover:bg-gmeet-blue-90'
                                : 'bg-secondary hover:bg-secondary-80'
                            }`}
                        title={
                            isScreenSharing
                                ? 'Stop sharing'
                                : peerIsSharing
                                    ? 'Share your screen (will stop peer\'s share)'
                                    : 'Share your screen'
                        }
                    >
                        {isScreenSharing ? (
                            <MonitorOff size={20} className="text-primary-foreground" />
                        ) : (
                            <MonitorUp size={20} className="text-foreground" />
                        )}
                        {isScreenSharing && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-gmeet-blue rounded-full border-2 border-background animate-pulse-dot" />
                        )}
                    </button>

                    {/* Share options dropdown */}
                    {showShareDropdown && (
                        <div className="screen-share-dropdown">
                            <p className="text-foreground text-sm font-medium mb-3">
                                Share your screen
                            </p>

                            {/* Audio toggle */}
                            <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary cursor-pointer transition-colors mb-3">
                                <input
                                    type="checkbox"
                                    checked={shareAudio}
                                    onChange={(e) => setShareAudio(e.target.checked)}
                                    className="w-4 h-4 rounded accent-[hsl(var(--gmeet-blue))]"
                                />
                                <Volume2 size={16} className="text-muted-foreground" />
                                <span className="text-sm text-foreground">Share audio</span>
                            </label>

                            <button
                                onClick={handleStartShare}
                                className="w-full px-4 py-2.5 bg-gmeet-blue hover:bg-gmeet-blue-90 rounded-full text-primary-foreground text-sm font-medium transition-all active:scale-[0.98]"
                            >
                                Start sharing
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Sign Assist */}
            {onToggleSignAssist && (
                <button
                    onClick={onToggleSignAssist}
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${signAssistEnabled
                            ? 'bg-gmeet-green hover:bg-gmeet-green-90'
                            : 'bg-secondary hover:bg-secondary-80'
                        }`}
                    title={signAssistEnabled ? 'Disable Sign Assist' : 'Enable Sign Assist'}
                >
                    <Hand size={20} className={signAssistEnabled ? 'text-primary-foreground' : 'text-foreground'} />
                    {signAssistEnabled && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-gmeet-green rounded-full border-2 border-background animate-pulse-dot" />
                    )}
                </button>
            )}

            {/* Chat */}
            {onToggleChat && (
                <button
                    onClick={onToggleChat}
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${isChatOpen
                            ? 'bg-gmeet-blue hover:bg-gmeet-blue-90'
                            : 'bg-secondary hover:bg-secondary-80'
                        }`}
                    title="Toggle chat"
                >
                    <MessageSquare size={20} className={isChatOpen ? 'text-primary-foreground' : 'text-foreground'} />
                </button>
            )}

            {/* End Call */}
            {onEndCall && (
                <button
                    onClick={onEndCall}
                    className="w-14 h-12 rounded-full bg-destructive hover:bg-destructive-90 flex items-center justify-center transition-all duration-200 ml-2"
                    title="Leave call"
                >
                    <PhoneOff size={20} className="text-destructive-foreground" />
                </button>
            )}
        </div>
    );
};