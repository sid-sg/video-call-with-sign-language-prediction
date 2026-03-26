import { useSocket } from '../hooks/useSocket';
import { useTurnServers } from '../hooks/useTurnServers';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from './VideoPlayer';
import { MediaControls } from './MediaControls';
import { useDataChannel } from '../hooks/useDataChannel';
import { ChatPanel } from './ChatPanel';
import { MeetSignAssistPanel } from './MeetSignAssistPanel';
import { useState, useCallback } from 'react';
import { Copy, Check, LogOut, Users, Plus, Loader2, Shield, Clock, Video } from 'lucide-react';
import { useSignSentenceBuilder } from '../hooks/useSignSentenceBuilder';

export const VideoCall = () => {
  const {
    socket, userId, isConnected: socketConnected,
    roomCode, roomStatus, roomError, peerId, isInitiator,
    createRoom, joinRoom, leaveRoom,
  } = useSocket();

  const { turnServers, isLoadingTurn } = useTurnServers();
  const { localStream, mediaControls, toggleVideo, toggleAudio } = useMediaStream();

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
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ========= LOBBY ========= */}
      {showLobby && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-slide-up">
            {/* Logo area */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gmeet-blue flex items-center justify-center">
                  <Video size={22} className="text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-medium text-foreground tracking-tight">
                  SignCall
                </h1>
              </div>
              <p className="text-muted-foreground text-sm">
                Video calling with real-time sign language detection
              </p>
            </div>

            {/* Create Room Card */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              {/* Connection status */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-gmeet-green' : 'bg-destructive'}`} />
                <span className="text-xs text-muted-foreground">
                  {socketConnected ? 'Server connected' : 'Connecting to server...'}
                </span>
              </div>

              <button
                onClick={createRoom}
                disabled={!socketConnected}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-gmeet-blue hover:bg-gmeet-blue-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-primary-foreground font-medium transition-all active:scale-[0.98]"
              >
                <Plus size={18} />
                New meeting
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  or join
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  maxLength={6}
                  className="flex-1 px-4 py-3 bg-secondary rounded-full text-foreground text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  style={{ color: 'hsl(var(--foreground))' }}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!socketConnected || !joinInput.trim()}
                  className="px-5 py-3 rounded-full text-gmeet-blue font-medium text-sm hover:bg-gmeet-blue-10 disabled:text-muted-foreground disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                >
                  Join
                </button>
              </div>

              {/* Error */}
              {roomError && (
                <div className="p-3 bg-destructive-10 border border-destructive rounded-lg text-destructive text-center text-sm">
                  {roomError}
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: 'Encrypted' },
                { icon: Clock, label: 'Real-time' },
                { icon: Users, label: '1-on-1' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 py-3 rounded-lg bg-card-50 border border-border-50"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========= WAITING ========= */}
      {showWaiting && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center animate-slide-up space-y-6">
            <Loader2
              size={48}
              className="text-gmeet-blue animate-spin mx-auto"
            />
            <div>
              <h2 className="text-xl font-medium text-foreground mb-2">
                Waiting for others to join
              </h2>
              <p className="text-muted-foreground text-sm">
                Share this code with the person you want to call
              </p>
            </div>

            {/* Room code */}
            {roomCode && (
              <div className="space-y-3">
                <button
                  onClick={copyRoomCode}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-card border border-border rounded-xl hover:bg-secondary transition-all group"
                >
                  <span className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
                    {roomCode}
                  </span>
                  {copied ? (
                    <Check size={20} className="text-gmeet-green" />
                  ) : (
                    <Copy
                      size={20}
                      className="text-muted-foreground group-hover:text-foreground transition-colors"
                    />
                  )}
                </button>
                <p className="text-xs text-muted-foreground">
                  {copied ? 'Copied to clipboard' : 'Click to copy'}
                </p>
              </div>
            )}

            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-destructive hover:bg-destructive-10 text-sm font-medium transition-all mx-auto"
            >
              <LogOut size={16} />
              Leave
            </button>
          </div>
        </div>
      )}

      {/* ========= CALL SCREEN ========= */}
      {showCall && (
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gmeet-blue flex items-center justify-center">
                <Video size={16} className="text-primary-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">
                  SignCall
                </span>
                <span className="text-xs text-muted-foreground ml-3">
                  Room: {roomCode}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {peerConnected && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-gmeet-green" />
                  Peer connected
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Video Area + Chat */}
          <div className="flex-1 flex min-h-0">
            {/* Video Grid */}
            <div className="flex-1 p-2 flex gap-2 min-h-0 relative">
              {/* Remote video */}
              <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
                <VideoPlayer
                  videoRef={remoteVideoRef}
                  label="Peer"
                  isVideoEnabled={true}
                />
              </div>

              {/* Local video */}
              <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
                <VideoPlayer
                  stream={localStream}
                  label="You"
                  muted
                  isVideoEnabled={mediaControls.video}
                  isLocal={true}
                  enableSignLanguage={signAssistEnabled}
                  onPredictionChange={handlePredictionChange}
                />
                {/* Sign Assist overlay on local video */}
                {signAssistEnabled && (
                  <MeetSignAssistPanel
                    handDetected={handDetected}
                    currentLetter={currentLetter}
                    currentPrediction={currentPrediction}
                    bufferStatus={getBufferStatus()}
                  />
                )}
              </div>
            </div>

            {/* Chat Panel - slide out */}
            {isChatOpen && (
              <div className="w-80 flex-shrink-0 animate-fade-in">
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
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <div className="flex items-center justify-center py-4 flex-shrink-0">
            <div className="bg-control-bar rounded-full px-6 py-2 border border-border" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              <MediaControls
                controls={mediaControls}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                onEndCall={leaveRoom}
                signAssistEnabled={signAssistEnabled}
                onToggleSignAssist={toggleSignAssist}
                onToggleChat={() => setIsChatOpen(!isChatOpen)}
                isChatOpen={isChatOpen}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};