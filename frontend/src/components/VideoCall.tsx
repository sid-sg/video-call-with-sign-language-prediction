import { useSocket } from '../hooks/useSocket';
import { useTurnServers } from '../hooks/useTurnServers';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
// import { useChat } from '../hooks/useChat';
import { VideoPlayer } from './VideoPlayer';
// import { MediaControls } from './MediaControls';
// import { ChatPanel } from './ChatPanel';


export const VideoCall = () => {
    const { socket, userId, isConnected: socketConnected } = useSocket();
    const { turnServers, isLoadingTurn } = useTurnServers();
    const { localStream, localVideoRef, mediaControls } = useMediaStream();

    const { remoteVideoRef, targetId, setTargetId, callPeer, isConnected: peerConnected } =
        useWebRTC({
            socket, userId, turnServers, localStream, isLoadingTurn,
        });



    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold mb-8 text-center">WebRTC Video Call</h2>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Video Section */}
                    <div className="flex-1">
                        <div className="flex flex-col gap-6">
                            {/* Videos */}
                            <div className="flex flex-wrap gap-4 justify-center">
                                <VideoPlayer
                                    videoRef={localVideoRef}
                                    label="🟢 Local Video"
                                    muted
                                    isVideoEnabled={mediaControls.video}
                                />
                                <VideoPlayer
                                    videoRef={remoteVideoRef}
                                    label="🔵 Remote Video"
                                />
                            </div>

                            {/* Media Controls */}
                            {/* <div className="flex justify-center">
                <MediaControls
                  controls={mediaControls}
                  onToggleVideo={toggleVideo}
                  onToggleAudio={toggleAudio}
                />
              </div> */}

                            {/* Call Controls */}
                            <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center gap-2 w-full max-w-md">
                                    <input
                                        placeholder="Enter Peer ID"
                                        value={targetId || ''}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={callPeer}
                                        disabled={!targetId || !socket || isLoadingTurn}
                                        className="bg-blue-500 text-white px-6 py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors font-semibold"
                                    >
                                        Call
                                    </button>
                                </div>

                                {userId && (
                                    <div className="w-full max-w-md p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            Your ID: <span className="font-mono font-bold">{userId}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Share this ID to receive calls
                                        </p>
                                    </div>
                                )}

                                {/* Connection Status */}
                                <div className="flex gap-4 text-sm">
                                    <span className={`flex items-center gap-2 ${socketConnected ? 'text-green-600' : 'text-red-600'}`}>
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        {socketConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                    {peerConnected && (
                                        <span className="flex items-center gap-2 text-green-600">
                                            <span className="w-2 h-2 rounded-full bg-current"></span>
                                            Peer Connected
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat Section */}
                    {/* <div className="lg:w-auto"> */}
                    {/* <ChatPanel
              messages={messages}
              inputMessage={inputMessage}
              onInputChange={setInputMessage}
              onSendMessage={sendMessage}
              userId={userId}
            /> */}
                    {/* </div> */}
                </div>
            </div>
        </div>

    );
};