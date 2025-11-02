import { useSocket } from '../hooks/useSocket';
import { useTurnServers } from '../hooks/useTurnServers';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from './VideoPlayer';
import { MediaControls } from './MediaControls';
import { useDataChannel } from '../hooks/useDataChannel';
import { ChatPanel } from './ChatPanel';
import { useState } from 'react';

export const VideoCall = () => {
    const { socket, userId, isConnected: socketConnected } = useSocket();
    const { turnServers, isLoadingTurn } = useTurnServers();
    const { localStream, localVideoRef, mediaControls, toggleVideo, toggleAudio } = useMediaStream();

    const { remoteVideoRef, targetId, setTargetId, callPeer, isConnected: peerConnected, dataChannel } =
        useWebRTC({
            socket, userId, turnServers, localStream, isLoadingTurn,
        });
    const { messages, sendMessage, isChannelOpen } = useDataChannel({ dataChannel, userId });

    // Sign language detection toggle
    const [signAssistEnabled, setSignAssistEnabled] = useState(false);
    const [currentPrediction, setCurrentPrediction] = useState<{ label: string; confidence: number; inferenceTime: number } | null>(null);
    const [handDetected, setHandDetected] = useState(false);

    const toggleSignAssist = () => {
        setSignAssistEnabled(!signAssistEnabled);
        console.log('Sign Assist toggled:', !signAssistEnabled);
    };

    const handlePredictionChange = (prediction: { label: string; confidence: number; inferenceTime: number } | null, detected: boolean) => {
        setCurrentPrediction(prediction);
        setHandDetected(detected);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        🤟 Sign Language Video Call
                    </h2>
                    <p className="text-gray-600">Real-time sign language detection powered by AI</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Video Section */}
                    <div className="flex-1">
                        <div className="flex flex-col gap-6">
                            {/* Videos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <VideoPlayer
                                    videoRef={localVideoRef}
                                    label="🟢 You"
                                    muted
                                    isVideoEnabled={mediaControls.video}
                                    isLocal={true}
                                    enableSignLanguage={signAssistEnabled}
                                    onPredictionChange={handlePredictionChange}
                                />
                                <VideoPlayer
                                    videoRef={remoteVideoRef}
                                    label="🔵 Remote"
                                    isLocal={false}
                                    enableSignLanguage={signAssistEnabled}
                                />
                            </div>

                            {/* Media Controls with Sign Assist */}
                            <div className="flex justify-center">
                                <MediaControls
                                    controls={mediaControls}
                                    onToggleVideo={toggleVideo}
                                    onToggleAudio={toggleAudio}
                                    signAssistEnabled={signAssistEnabled}
                                    onToggleSignAssist={toggleSignAssist}
                                />
                            </div>

                            {/* Sign Assist Status with Prediction */}
                            {signAssistEnabled && (
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
                                    <div className="flex items-center justify-between gap-6">
                                        {/* Status Text */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl animate-pulse">🤟</span>
                                            <div>
                                                <p className="text-green-700 font-bold text-lg">Sign Assist Active</p>
                                                <p className="text-green-600 text-sm">Hand detection and recognition enabled</p>
                                            </div>
                                        </div>

                                        {/* Prediction Display */}
                                        <div className="flex-shrink-0">
                                            {handDetected && currentPrediction ? (
                                                <div className="bg-white rounded-xl shadow-xl border-4 border-green-500 p-6 min-w-[200px]">
                                                    <div className="text-center">
                                                        <div className="text-7xl font-black text-green-600 mb-2">
                                                            {currentPrediction.label}
                                                        </div>
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <div className="font-semibold">
                                                                {(currentPrediction.confidence * 100).toFixed(1)}% confident
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {currentPrediction.inferenceTime.toFixed(1)}ms
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-green-500 h-full rounded-full transition-all duration-300"
                                                                style={{ width: `${currentPrediction.confidence * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-6 min-w-[200px]">
                                                    <div className="text-center text-gray-400">
                                                        <div className="text-5xl mb-2">👋</div>
                                                        <div className="text-sm">Show your hand</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Call Controls */}
                            <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center gap-2 w-full max-w-md">
                                    <input
                                        placeholder="Enter Peer ID to call"
                                        value={targetId || ''}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={callPeer}
                                        disabled={!targetId || !socket || isLoadingTurn}
                                        className="bg-blue-500 text-white px-6 py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors font-semibold shadow-md"
                                    >
                                        📞 Call
                                    </button>
                                </div>

                                {userId && (
                                    <div className="w-full max-w-md p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-gray-700 font-medium">
                                            Your ID: <span className="font-mono font-bold text-blue-600">{userId}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            📋 Share this ID to receive calls
                                        </p>
                                    </div>
                                )}

                                {/* Connection Status */}
                                <div className="flex gap-4 text-sm">
                                    <span className={`flex items-center gap-2 font-medium ${socketConnected ? 'text-green-600' : 'text-red-600'}`}>
                                        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                        {socketConnected ? 'Server Connected' : 'Disconnected'}
                                    </span>
                                    {peerConnected && (
                                        <span className="flex items-center gap-2 text-green-600 font-medium">
                                            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                            Peer Connected
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat Section */}
                    <div className="lg:w-96">
                        <ChatPanel
                            messages={messages}
                            onSendMessage={sendMessage}
                            isChannelOpen={isChannelOpen}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};