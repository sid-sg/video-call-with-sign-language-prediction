import { Video, VideoOff, Mic, MicOff, Hand, PhoneOff, MessageSquare, MoreVertical } from 'lucide-react';
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
}: MediaControlsProps) => {
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3">
            {/* Mic */}
            <button
                onClick={onToggleAudio}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                    controls.audio
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
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                    controls.video
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

            {/* Sign Assist */}
            {onToggleSignAssist && (
                <button
                    onClick={onToggleSignAssist}
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                        signAssistEnabled
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
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isChatOpen
                            ? 'bg-gmeet-blue hover:bg-gmeet-blue-90'
                            : 'bg-secondary hover:bg-secondary-80'
                    }`}
                    title="Toggle chat"
                >
                    <MessageSquare size={20} className={isChatOpen ? 'text-primary-foreground' : 'text-foreground'} />
                </button>
            )}

            {/* More options */}
            <button
                className="w-12 h-12 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary-80 transition-all duration-200"
                title="More options"
            >
                <MoreVertical size={20} className="text-foreground" />
            </button>

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