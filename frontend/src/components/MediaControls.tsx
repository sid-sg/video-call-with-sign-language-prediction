import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import type { MediaControls as MediaControlsType } from '../types/webrtc.types';

interface MediaControlsProps {
    controls: MediaControlsType;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
}

export const MediaControls = ({
    controls,
    onToggleVideo,
    onToggleAudio
}: MediaControlsProps) => {
    return (
        <div className="flex gap-2">
            <button
                onClick={onToggleVideo}
                className={`p-3 rounded-full transition-colors ${controls.video
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                title={controls.video ? 'Turn off video' : 'Turn on video'}
            >
                {controls.video ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
                onClick={onToggleAudio}
                className={`p-3 rounded-full transition-colors ${controls.audio
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                title={controls.audio ? 'Mute' : 'Unmute'}
            >
                {controls.audio ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
        </div>
    );
};
