import { useSocket } from '../hooks/useSocket';
import { useTurnServers } from '../hooks/useTurnServers';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from './VideoPlayer';
import { MediaControls } from './MediaControls';
import { useDataChannel } from '../hooks/useDataChannel';
import { ChatPanel } from './ChatPanel';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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
    const [copied, setCopied] = useState(false);

    const toggleSignAssist = () => {
        setSignAssistEnabled(!signAssistEnabled);
        console.log('Sign Assist toggled:', !signAssistEnabled);
    };

    const handlePredictionChange = (prediction: { label: string; confidence: number; inferenceTime: number } | null, detected: boolean) => {
        setCurrentPrediction(prediction);
        setHandDetected(detected);
    };

    const copyToClipboard = () => {
        if (userId) {
            navigator.clipboard.writeText(userId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                     <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                         🤟 Sign Language Video Call
                     </h2>
                    <p className="text-gray-600 text-lg">Real-time AI-powered sign language detection</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Video Section */}
                    <div className="flex-1">
                        <div className="space-y-6">
                            {/* Videos Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                            {/* Media Controls */}
                            <div className="flex justify-center">
                                <MediaControls
                                    controls={mediaControls}
                                    onToggleVideo={toggleVideo}
                                    onToggleAudio={toggleAudio}
                                    signAssistEnabled={signAssistEnabled}
                                    onToggleSignAssist={toggleSignAssist}
                                />
                            </div>

                            {/* Sign Assist Panel */}
                            {signAssistEnabled && (
                                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                                        <div className="flex items-center gap-3 text-white">
                                            <span className="text-3xl animate-pulse">✨</span>
                                            <div>
                                                <p className="font-bold text-xl">Sign Assist Active</p>
                                                <p className="text-green-100 text-sm">AI-powered hand detection enabled</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {handDetected && currentPrediction ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-2xl p-8 shadow-xl">
                                                        <div className="text-8xl font-black text-center">
                                                            {currentPrediction.label}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Prediction Details</div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold">
                                                                {(currentPrediction.confidence * 100).toFixed(1)}% Confidence
                                                            </div>
                                                            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold">
                                                                {currentPrediction.inferenceTime.toFixed(1)}ms
                                                            </div>
                                                        </div>
                                                        <div className="w-64">
                                                            <div className="bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                                                                <div
                                                                    className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                                                                    style={{ width: `${currentPrediction.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="text-7xl mb-4 animate-pulse">👋</div>
                                                <p className="text-gray-600 font-semibold text-lg">Show your hand to start detection</p>
                                                <p className="text-gray-400 text-sm mt-2">Make sure your hand is visible to the camera</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Call Controls */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        placeholder="Enter Peer ID to connect..."
                                        value={targetId || ''}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="flex-1 border-2 border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        onClick={callPeer}
                                        disabled={!targetId || !socket || isLoadingTurn}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 transition-all font-bold text-lg"
                                    >
                                        📞 Call
                                    </button>
                                </div>

                                {userId && (
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                                        <p className="text-sm text-gray-700 font-semibold mb-2">Your Connection ID</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <code className="flex-1 bg-white px-4 py-2 rounded-lg font-mono text-blue-600 font-bold border border-blue-200">
                                                {userId}
                                            </code>
                                            <button
                                                onClick={copyToClipboard}
                                                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all transform hover:scale-110"
                                                title="Copy ID"
                                            >
                                                {copied ? <Check size={20} /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">📋 Share this ID to receive calls</p>
                                    </div>
                                )}

                                {/* Connection Status */}
                                <div className="flex items-center justify-center gap-6 pt-2">
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        <span className="w-3 h-3 rounded-full bg-current animate-pulse"></span>
                                        {socketConnected ? 'Server Connected' : 'Server Disconnected'}
                                    </div>
                                    {peerConnected && (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                            <span className="w-3 h-3 rounded-full bg-current animate-pulse"></span>
                                            Peer Connected
                                        </div>
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