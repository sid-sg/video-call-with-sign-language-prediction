import { Video, VideoOff, Mic, MicOff, Hand, PhoneOff } from 'lucide-react';
import type { MediaControls as MediaControlsType } from '../types/webrtc.types';

interface MediaControlsProps {
    controls: MediaControlsType;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
    onEndCall?: () => void;
    signAssistEnabled?: boolean;
    onToggleSignAssist?: () => void;
}

export const MediaControls = ({
    controls,
    onToggleVideo,
    onToggleAudio,
    onEndCall,
    signAssistEnabled = false,
    onToggleSignAssist
}: MediaControlsProps) => {
    return (
        <div className="flex items-center justify-center gap-3">
            <button
                onClick={onToggleVideo}
                className={`p-3 rounded-full transition-colors ${controls.video
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white shadow-md`}
                title={controls.video ? 'Turn off video' : 'Turn on video'}
            >
                {controls.video ? <Video size={20} /> : <VideoOff size={20} />}
            </button>


            {onToggleSignAssist && (
                <button
                    onClick={onToggleSignAssist}
                    className={`p-3 rounded-full transition-colors ${signAssistEnabled
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gray-400 hover:bg-gray-500'
                        } text-white shadow-md`}
                    title={signAssistEnabled ? 'Disable Sign Assist' : 'Enable Sign Assist'}
                >
                    <Hand size={20} />
                </button>
            )}

            <button
                onClick={onToggleAudio}
                className={`p-3 rounded-full transition-colors ${controls.audio
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white shadow-md`}
                title={controls.audio ? 'Mute' : 'Unmute'}
            >
                {controls.audio ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            {/* End Call — visually separated from the toggle buttons */}
            {onEndCall && (
                <button
                    onClick={onEndCall}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-lg transition-all mx-2"
                    title="End call"
                >
                    <PhoneOff size={20} />
                </button>
            )}

        </div>
    );
};