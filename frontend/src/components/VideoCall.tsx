import { useSocket } from '../hooks/useSocket';
import { useTurnServers } from '../hooks/useTurnServers';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
import { useScreenShare } from '../hooks/useScreenShare';
import { VideoPlayer } from './VideoPlayer';
import { MediaControls } from './MediaControls';
import { useDataChannel } from '../hooks/useDataChannel';
import { ChatPanel } from './ChatPanel';
import { MeetSignAssistPanel } from './MeetSignAssistPanel';
import { useState, useCallback, useEffect } from 'react';
import { Copy, Check, LogOut, Plus, Loader2, Video, Minimize2, X, AlertCircle } from 'lucide-react';
import { useSignSentenceBuilder } from '../hooks/useSignSentenceBuilder';

type MaximizedVideo = 'local' | 'remote' | 'screen' | null;

export const VideoCall = () => {
  const {
    socket, userId, isConnected: socketConnected,
    roomCode, roomStatus, roomError, peerId, isInitiator,
    createRoom, joinRoom, leaveRoom,
  } = useSocket();

  const { turnServers, isLoadingTurn } = useTurnServers();
  const { localStream, mediaControls, toggleVideo, toggleAudio, micError, dismissMicError } = useMediaStream();

  const { remoteStream, remoteScreenStream, isConnected: peerConnected, dataChannel, peerConnection, hasRemoteScreen, renegotiate } =
    useWebRTC({
      socket, userId, turnServers, localStream, isLoadingTurn,
      peerId, isInitiator, roomStatus,
    });

  // Screen share — needs handlePeerScreenShareChange as data channel callback
  // We'll set up the data channel with a callback, then pass it to screen share
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);

  const handlePeerScreenShareCb = useCallback((sharing: boolean) => {
    setPeerScreenSharing(sharing);
  }, []);

  const { messages, sendMessage, isChannelOpen, peerVideoEnabled, sendMediaState, sendScreenShareState } =
    useDataChannel({ dataChannel, userId, onScreenShareChange: handlePeerScreenShareCb });

  const {
    isSharing: isScreenSharing,
    peerIsSharing,
    startScreenShare,
    stopScreenShare,
    handlePeerScreenShareChange,
  } = useScreenShare({
    peerConnection,
    sendScreenShareState,
    renegotiate,
  });

  // Sync the data channel callback to the screen share hook
  useEffect(() => {
    if (peerScreenSharing !== undefined) {
      handlePeerScreenShareChange(peerScreenSharing);
    }
  }, [peerScreenSharing, handlePeerScreenShareChange]);

  // Sign language detection toggle
  const [signAssistEnabled, setSignAssistEnabled] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<{ label: string; confidence: number; inferenceTime: number } | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [maximizedVideo, setMaximizedVideo] = useState<MaximizedVideo>(null);

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
    const nextState = !signAssistEnabled;
    setSignAssistEnabled(nextState);
    setIsChatOpen(nextState);
  };

  // Notify peer when local video state changes
  useEffect(() => {
    if (isChannelOpen) {
      sendMediaState(mediaControls.video);
    }
  }, [mediaControls.video, isChannelOpen, sendMediaState]);

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

  // Is anyone sharing their screen?
  const anyScreenSharing = isScreenSharing || peerIsSharing;

  // Show lobby if not in a room or waiting
  const showLobby = roomStatus === 'idle' || roomStatus === 'error';
  const showWaiting = roomStatus === 'waiting';
  const showCall = roomStatus === 'ready';

  // ─── Maximize overlay ───
  const renderMaximizedOverlay = () => {
    if (!maximizedVideo) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center animate-maximize-in">
        {/* Minimize button */}
        <button
          onClick={() => setMaximizedVideo(null)}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-lg bg-secondary hover:bg-secondary-80 flex items-center justify-center transition-all duration-200"
          title="Minimize"
        >
          <Minimize2 size={20} className="text-foreground" />
        </button>

        {/* Label */}
        <div className="absolute top-4 left-4 z-50">
          <span className="bg-background-70 backdrop-blur-sm text-foreground text-sm font-medium px-4 py-2 rounded-lg">
            {maximizedVideo === 'local' ? 'You' : maximizedVideo === 'remote' ? 'Peer' : 'Screen Share'}
          </span>
        </div>

        <div className="w-full h-full">
          {maximizedVideo === 'local' && (
            <VideoPlayer
              stream={localStream}
              label="You"
              muted
              isVideoEnabled={mediaControls.video}
              isLocal={true}
              enableSignLanguage={signAssistEnabled}
              onPredictionChange={handlePredictionChange}
            />
          )}
          {maximizedVideo === 'remote' && (
            <VideoPlayer
              stream={remoteStream}
              label="Peer"
              isVideoEnabled={peerVideoEnabled}
            />
          )}
          {maximizedVideo === 'screen' && (
            isScreenSharing ? (
              <VideoPlayer
                stream={localStream}
                label="Your Screen"
                muted
                isVideoEnabled={true}
                isScreenShare={true}
              />
            ) : (
              <VideoPlayer
                stream={remoteScreenStream}
                label="Peer's Screen"
                isVideoEnabled={true}
                isScreenShare={true}
              />
            )
          )}
        </div>
      </div>
    );
  };

  // ─── Presentation layout (screen share active) ───
  const renderPresentationLayout = () => (
    <div className="flex-1 p-2 flex gap-2 min-h-0 relative">
      {/* Sidebar — webcam tiles stacked vertically on the left */}
      <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: '280px', minWidth: '200px' }}>

        {/* Remote webcam */}
        <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
          <VideoPlayer
            stream={remoteStream}
            label="Peer"
            isVideoEnabled={peerVideoEnabled}
            onMaximize={() => setMaximizedVideo('remote')}
          />
        </div>

        {/* Local webcam */}
        <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
          <VideoPlayer
            stream={localStream}
            label="You"
            muted
            isVideoEnabled={mediaControls.video}
            isLocal={true}
            enableSignLanguage={signAssistEnabled}
            onPredictionChange={handlePredictionChange}
            onMaximize={() => setMaximizedVideo('local')}
          />
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

      {/* Main area — shared screen (big) */}
      <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
        {isScreenSharing ? (
          // Local screen share — show a preview
          <div className="w-full h-full flex items-center justify-center bg-surface-video relative">
            <div className="text-center">
              <MonitorUpIcon />
              <p className="text-foreground text-lg font-medium mt-4">You are presenting</p>
              <p className="text-muted-foreground text-sm mt-1">Your screen is being shared with the call</p>
              <button
                onClick={stopScreenShare}
                className="mt-4 px-5 py-2.5 bg-destructive hover:bg-destructive-90 rounded-full text-destructive-foreground text-sm font-medium transition-all active:scale-[0.98]"
              >
                Stop presenting
              </button>
            </div>
            {/* Maximize for the shared screen */}
            <button
              onClick={() => setMaximizedVideo('screen')}
              className="maximize-btn absolute top-3 right-3 z-10 w-8 h-8 rounded-md bg-background-70 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-all duration-200 opacity-0 hover:opacity-100"
              title="Maximize"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          </div>
        ) : peerIsSharing && hasRemoteScreen ? (
          // Peer's screen share
          <VideoPlayer
            stream={remoteScreenStream}
            label="Peer's Screen"
            isVideoEnabled={true}
            isScreenShare={true}
            onMaximize={() => setMaximizedVideo('screen')}
          />
        ) : (
          // Fallback — shouldn't happen if anyScreenSharing is correct
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground">Waiting for screen share...</p>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Normal layout (no screen share) ───
  const renderNormalLayout = () => (
    <div className="flex-1 p-2 flex gap-2 min-h-0 relative">
      {/* Remote video */}
      <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
        <VideoPlayer
          stream={remoteStream}
          label="Peer"
          isVideoEnabled={peerVideoEnabled}
          onMaximize={() => setMaximizedVideo('remote')}
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
          onMaximize={() => setMaximizedVideo('local')}
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
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Maximize overlay */}
      {renderMaximizedOverlay()}

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
              {/* Screen sharing indicator */}
              {anyScreenSharing && (
                <span className="flex items-center gap-1.5 text-xs text-gmeet-blue bg-gmeet-blue-10 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-gmeet-blue animate-pulse-dot" />
                  {isScreenSharing ? 'You are presenting' : 'Peer is presenting'}
                </span>
              )}
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
            {/* Dynamic layout based on screen sharing */}
            {anyScreenSharing ? renderPresentationLayout() : renderNormalLayout()}

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
                isScreenSharing={isScreenSharing}
                onStartScreenShare={startScreenShare}
                onStopScreenShare={stopScreenShare}
                peerIsSharing={peerIsSharing}
              />
            </div>
          </div>
        </>
      )}

      {/* Mic Error Toast */}
      {micError && showCall && (
        <div className="fixed bottom-24 left-4 z-50 animate-slide-up flex flex-col gap-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border shadow-lg max-w-sm rounded-xl">
            <div className="w-8 h-8 rounded-full bg-destructive-10 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-destructive" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-medium text-foreground">Your mic is disabled</p>
              <p className="text-xs text-muted-foreground truncate">Please check your permissions.</p>
            </div>
            <button
              onClick={dismissMicError}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple monitor icon for "You are presenting" state
const MonitorUpIcon = () => (
  <div className="w-20 h-20 mx-auto rounded-2xl bg-gmeet-blue-20 flex items-center justify-center">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(214, 82%, 51%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17V21M8 21H16M20 4H4C2.89543 4 2 4.89543 2 6V14C2 15.1046 2.89543 16 4 16H20C21.1046 16 22 15.1046 22 14V6C22 4.89543 21.1046 4 20 4Z" />
      <path d="M12 8V12M12 8L9 11M12 8L15 11" />
    </svg>
  </div>
);