// import { useSocket } from '../hooks/useSocket';
// import { useTurnServers } from '../hooks/useTurnServers';
// import { useMediaStream } from '../hooks/useMediaStream';
// import { useWebRTC } from '../hooks/useWebRTC';
// import { VideoPlayer } from './VideoPlayer';
// import { MediaControls } from './MediaControls';
// import { useDataChannel } from '../hooks/useDataChannel';
// import { ChatPanel } from './ChatPanel';
// import { useState, useCallback } from 'react';
// import { Copy, Check } from 'lucide-react';
// import { useSignSentenceBuilder } from '../hooks/useSignSentenceBuilder';

// export const VideoCall = () => {
//     const { socket, userId, isConnected: socketConnected } = useSocket();
//     const { turnServers, isLoadingTurn } = useTurnServers();
//     const { localStream, localVideoRef, mediaControls, toggleVideo, toggleAudio } = useMediaStream();

//     const { remoteVideoRef, targetId, setTargetId, callPeer, isConnected: peerConnected, dataChannel } =
//         useWebRTC({
//             socket, userId, turnServers, localStream, isLoadingTurn,
//         });
//     const { messages, sendMessage, isChannelOpen } = useDataChannel({ dataChannel, userId });

//     // Sign language detection toggle
//     const [signAssistEnabled, setSignAssistEnabled] = useState(false);
//     const [currentPrediction, setCurrentPrediction] = useState<{ label: string; confidence: number; inferenceTime: number } | null>(null);
//     const [handDetected, setHandDetected] = useState(false);
//     const [copied, setCopied] = useState(false);

//     // Chat input text state (shared between manual typing and sign detection)
//     const [chatInputText, setChatInputText] = useState('');

//     // Callback for sign detection to update chat input
//     const handleSignTextUpdate = useCallback((text: string) => {
//         setChatInputText(text);
//     }, []);

//     // Sign sentence builder
//     const { currentLetter, syncText, getBufferStatus } = useSignSentenceBuilder({
//         prediction: currentPrediction,
//         handDetected,
//         enabled: signAssistEnabled,
//         onTextUpdate: handleSignTextUpdate,
//     });


//     const toggleSignAssist = () => {
//         setSignAssistEnabled(!signAssistEnabled);
//         console.log('Sign Assist toggled:', !signAssistEnabled);
//     };

//     const handlePredictionChange = (prediction: { label: string; confidence: number; inferenceTime: number } | null, detected: boolean) => {
//         setCurrentPrediction(prediction);
//         setHandDetected(detected);
//     };

//     const copyToClipboard = () => {
//         if (userId) {
//             navigator.clipboard.writeText(userId);
//             setCopied(true);
//             setTimeout(() => setCopied(false), 2000);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
//             <div>
//                 {/* Header */}
//                 <div className="text-center mb-10">
//                     <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
//                         🤟 Sign Language Video Call
//                     </h2>
//                     <p className="text-gray-600 text-lg">Real-time AI-powered sign language detection</p>
//                 </div>

//                 <div className="flex flex-col lg:flex-row gap-6">
//                     {/* Main Video Section */}
//                     <div className="flex-1">
//                         <div className="space-y-6">
//                             {/* Videos Grid */}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 <VideoPlayer
//                                     videoRef={localVideoRef}
//                                     label="🟢 You"
//                                     muted
//                                     isVideoEnabled={mediaControls.video}
//                                     isLocal={true}
//                                     enableSignLanguage={signAssistEnabled}
//                                     onPredictionChange={handlePredictionChange}
//                                 />
//                                 <VideoPlayer
//                                     videoRef={remoteVideoRef}
//                                     label="🔵 Remote"
//                                     isLocal={false}
//                                     enableSignLanguage={signAssistEnabled}
//                                 />
//                             </div>

//                             {/* Media Controls */}
//                             <div className="flex justify-center">
//                                 <MediaControls
//                                     controls={mediaControls}
//                                     onToggleVideo={toggleVideo}
//                                     onToggleAudio={toggleAudio}
//                                     signAssistEnabled={signAssistEnabled}
//                                     onToggleSignAssist={toggleSignAssist}
//                                 />
//                             </div>

//                             {/* Sign Assist Panel - Simplified */}
//                             {signAssistEnabled && (
//                                 <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
//                                     <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
//                                         <div className="flex items-center gap-3 text-white">
//                                             <span className="text-3xl animate-pulse">✨</span>
//                                             <div>
//                                                 <p className="font-bold text-xl">Sign Assist Active</p>
//                                                 <p className="text-green-100 text-sm">Letters will appear in chat box as you sign</p>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     <div className="p-6">
//                                         {/* Current Letter Detection */}
//                                         <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
//                                             <div className="text-sm text-gray-600 font-semibold mb-3">Current Detection</div>
//                                             {handDetected && currentLetter ? (
//                                                 <div className="flex items-center gap-4">
//                                                     <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-6 shadow-lg">
//                                                         <div className="text-6xl font-black">{currentLetter}</div>
//                                                     </div>
//                                                     <div className="flex-1">
//                                                         {currentPrediction && (
//                                                             <div className="space-y-2">
//                                                                 <div className="flex items-center gap-2">
//                                                                     <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-bold">
//                                                                         {(currentPrediction.confidence * 100).toFixed(1)}% Confidence
//                                                                     </div>
//                                                                     <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold">
//                                                                         {currentPrediction.inferenceTime.toFixed(1)}ms
//                                                                     </div>
//                                                                 </div>
//                                                                 <div className="w-full">
//                                                                     <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
//                                                                         <div
//                                                                             className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all duration-300"
//                                                                             style={{ width: `${currentPrediction.confidence * 100}%` }}
//                                                                         />
//                                                                     </div>
//                                                                 </div>
//                                                             </div>
//                                                         )}
//                                                         {/* Buffer Status */}
//                                                         {getBufferStatus() && (
//                                                             <div className="mt-3 flex gap-2 flex-wrap">
//                                                                 {getBufferStatus()?.slice(0, 3).map(({ letter, count, percentage }) => (
//                                                                     <div key={letter} className="bg-white px-2 py-1 rounded text-xs font-mono border border-purple-200">
//                                                                         <span className="font-bold">{letter}</span>: {count}/8 ({percentage.toFixed(0)}%)
//                                                                     </div>
//                                                                 ))}
//                                                             </div>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             ) : (
//                                                 <div className="text-center py-4">
//                                                     <div className="text-5xl mb-2 animate-pulse">👋</div>
//                                                     <p className="text-gray-500 text-sm">Show your hand to start signing</p>
//                                                 </div>
//                                             )}
//                                         </div>

//                                         {/* Instructions */}
//                                         <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
//                                             <div className="flex items-start gap-3">
//                                                 <span className="text-2xl">💡</span>
//                                                 <div className="text-sm text-gray-700 space-y-1">
//                                                     <p className="font-semibold text-blue-900">How to use:</p>
//                                                     <ul className="list-disc list-inside space-y-1 text-gray-600">
//                                                         <li>Sign letters - they'll appear in the chat input box</li>
//                                                         <li>Pause for 0.6s to add a space automatically</li>
//                                                         <li>Use keyboard Backspace to delete mistakes</li>
//                                                         <li>Press Enter or click Send when ready</li>
//                                                     </ul>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Call Controls */}
//                             <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
//                                 <div className="flex items-center gap-3">
//                                     <input
//                                         placeholder="Enter Peer ID to connect..."
//                                         value={targetId || ''}
//                                         onChange={(e) => setTargetId(e.target.value)}
//                                         className="flex-1 border-2 border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
//                                     />
//                                     <button
//                                         onClick={callPeer}
//                                         disabled={!targetId || !socket || isLoadingTurn}
//                                         className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 transition-all font-bold text-lg"
//                                     >
//                                         📞 Call
//                                     </button>
//                                 </div>

//                                 {userId && (
//                                     <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
//                                         <p className="text-sm text-gray-700 font-semibold mb-2">Your Connection ID</p>
//                                         <div className="flex items-center justify-between gap-3">
//                                             <code className="flex-1 bg-white px-4 py-2 rounded-lg font-mono text-blue-600 font-bold border border-blue-200">
//                                                 {userId}
//                                             </code>
//                                             <button
//                                                 onClick={copyToClipboard}
//                                                 className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all transform hover:scale-110"
//                                                 title="Copy ID"
//                                             >
//                                                 {copied ? <Check size={20} /> : <Copy size={20} />}
//                                             </button>
//                                         </div>
//                                         <p className="text-xs text-gray-500 mt-2">📋 Share this ID to receive calls</p>
//                                     </div>
//                                 )}

//                                 {/* Connection Status */}
//                                 <div className="flex items-center justify-center gap-6 pt-2">
//                                     <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
//                                         <span className="w-3 h-3 rounded-full bg-current animate-pulse"></span>
//                                         {socketConnected ? 'Server Connected' : 'Server Disconnected'}
//                                     </div>
//                                     {peerConnected && (
//                                         <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold">
//                                             <span className="w-3 h-3 rounded-full bg-current animate-pulse"></span>
//                                             Peer Connected
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Chat Section */}
//                     <div className="lg:w-96">
//                         <ChatPanel
//                             messages={messages}
//                             onSendMessage={sendMessage}
//                             isChannelOpen={isChannelOpen}
//                             inputText={chatInputText}
//                             onInputTextChange={(text) => {
//                                 setChatInputText(text);
//                                 syncText(text); // Sync with sign detection
//                             }}
//                             signAssistActive={signAssistEnabled}
//                         />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

import { useSocket } from '../hooks/useSocket';
import { useTurnServers } from '../hooks/useTurnServers';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from './VideoPlayer';
import { MediaControls } from './MediaControls';
import { useDataChannel } from '../hooks/useDataChannel';
import { ChatPanel } from './ChatPanel';
import { useState, useCallback } from 'react';
import { Copy, Check, LogOut, Users, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useSignSentenceBuilder } from '../hooks/useSignSentenceBuilder';

export const VideoCall = () => {
  const {
    socket, userId, isConnected: socketConnected,
    roomCode, roomStatus, roomError, peerId, isInitiator,
    createRoom, joinRoom, leaveRoom,
  } = useSocket();

  const { turnServers, isLoadingTurn } = useTurnServers();
  const { localStream, localVideoRef, mediaControls, toggleVideo, toggleAudio } = useMediaStream();

  const { remoteVideoRef, isConnected: peerConnected, dataChannel } =
    useWebRTC({
      socket, userId, turnServers, localStream, isLoadingTurn,
      peerId, isInitiator, roomStatus,
    });

  const { messages, sendMessage, isChannelOpen } = useDataChannel({ dataChannel, userId });

  // Sign language detection toggle
  const [signAssistEnabled, setSignAssistEnabled] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<{ label: string; confidence: number; inferenceTime: number } | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState('');

  // Chat input text state
  const [chatInputText, setChatInputText] = useState('');

  const handleSignTextUpdate = useCallback((text: string) => {
    setChatInputText(text);
  }, []);

  const { currentLetter, syncText, getBufferStatus } = useSignSentenceBuilder({
    prediction: currentPrediction,
    handDetected,
    enabled: signAssistEnabled,
    onTextUpdate: handleSignTextUpdate,
  });

  const toggleSignAssist = () => {
    setSignAssistEnabled(!signAssistEnabled);
  };

  const handlePredictionChange = (prediction: { label: string; confidence: number; inferenceTime: number } | null, detected: boolean) => {
    setCurrentPrediction(prediction);
    setHandDetected(detected);
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinRoom = () => {
    if (joinInput.trim()) {
      joinRoom(joinInput.trim());
    }
  };

  // Show lobby if not in a room or waiting
  const showLobby = roomStatus === 'idle' || roomStatus === 'error';
  const showWaiting = roomStatus === 'waiting';
  const showCall = roomStatus === 'ready';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="text-center py-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          🤟 Sign Language Video Call
        </h2>
        <p className="text-sm text-gray-400 mt-1">Real-time AI-powered sign language detection</p>
      </div>

      {/* Connection Status */}
      <div className="flex justify-center gap-3 py-2">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${socketConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {socketConnected ? '● Server Connected' : '○ Server Disconnected'}
        </span>
        {peerConnected && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            ● Peer Connected
          </span>
        )}
      </div>

      {/* ======= LOBBY SCREEN ======= */}
      {showLobby && (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="max-w-md w-full mx-4 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold">Join or Create a Room</h3>
              <p className="text-gray-400">Share the room code with the person you want to call</p>
            </div>

            {/* Create Room */}
            <button
              onClick={createRoom}
              disabled={!socketConnected}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Create New Room
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-gray-400 text-sm">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Join Room */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter room code (e.g. ABC123)"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                maxLength={6}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!socketConnected || !joinInput.trim()}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-gray-800 disabled:cursor-not-allowed border border-white/20 rounded-xl font-semibold transition-all"
              >
                <ArrowRight className="w-5 h-5" />
                Join Room
              </button>
            </div>

            {/* Error */}
            {roomError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-center text-sm">
                {roomError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======= WAITING SCREEN ======= */}
      {showWaiting && (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="max-w-md w-full mx-4 space-y-6 text-center">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
            <h3 className="text-2xl font-bold">Waiting for peer...</h3>
            <p className="text-gray-400">Share this room code with the person you want to call</p>

            {/* Room Code Display */}
            {roomCode && (
              <div className="space-y-3">
                <div
                  onClick={copyRoomCode}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 border-2 border-dashed border-purple-500/50 rounded-2xl cursor-pointer hover:bg-white/15 transition-all group"
                >
                  <span className="text-4xl font-mono font-bold tracking-[0.3em] text-purple-300">
                    {roomCode}
                  </span>
                  {copied ? (
                    <Check className="w-6 h-6 text-green-400" />
                  ) : (
                    <Copy className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="text-gray-500 text-sm">
                  {copied ? '✅ Copied!' : 'Click to copy'}
                </p>
              </div>
            )}

            <button
              onClick={leaveRoom}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-400 text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              Leave Room
            </button>
          </div>
        </div>
      )}

      {/* ======= CALL SCREEN ======= */}
      {showCall && (
        <div className="p-4 space-y-4">
          {/* Room Info Bar */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Room:</span>
              <span className="font-mono font-bold text-purple-300 tracking-wider">{roomCode}</span>
            </div>
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Videos */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VideoPlayer
                  videoRef={localVideoRef}
                  label="You"
                  muted
                  isVideoEnabled={mediaControls.video}
                  isLocal={true}
                  enableSignLanguage={signAssistEnabled}
                  onPredictionChange={handlePredictionChange}
                />
                <VideoPlayer
                  videoRef={remoteVideoRef}
                  label="Remote"
                  isVideoEnabled={true}
                />
              </div>

              {/* Media Controls */}
              <MediaControls
                controls={mediaControls}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                signAssistEnabled={signAssistEnabled}
                onToggleSignAssist={toggleSignAssist}
              />

              {/* Sign Assist Panel */}
              {signAssistEnabled && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span>✨</span>
                    <span className="font-semibold text-purple-300">Sign Assist Active</span>
                    <span className="text-xs text-gray-400">Letters will appear in chat box as you sign</span>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-2">Current Detection</p>
                    {handDetected && currentLetter ? (
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-bold text-purple-300">{currentLetter}</span>
                        {currentPrediction && (
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>{(currentPrediction.confidence * 100).toFixed(1)}% Confidence</div>
                            <div>{currentPrediction.inferenceTime.toFixed(1)}ms</div>
                          </div>
                        )}
                        {getBufferStatus() && (
                          <div className="flex gap-1">
                            {getBufferStatus()?.slice(0, 3).map(({ letter, count, percentage }) => (
                              <span key={letter} className="text-xs bg-white/10 px-2 py-0.5 rounded">
                                {letter}: {count}/8 ({percentage.toFixed(0)}%)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-2xl">👋</span>
                        <p className="text-sm text-gray-400 mt-1">Show your hand to start signing</p>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>💡 <strong>How to use:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 ml-4">
                      <li>Sign letters – they'll appear in the chat input box</li>
                      <li>Pause for 0.6s to add a space automatically</li>
                      <li>Use keyboard Backspace to delete mistakes</li>
                      <li>Press Enter or click Send when ready</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="w-full lg:w-96">
              <ChatPanel
                messages={messages}
                onSendMessage={sendMessage}
                isChannelOpen={isChannelOpen}
                inputText={chatInputText}
                onInputTextChange={(text) => {
                  setChatInputText(text);
                  syncText(text);
                }}
                signAssistActive={signAssistEnabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};