import React, { useState, useCallback } from "react";
import {
  Copy,
  Check,
  LogOut,
  Users,
  Plus,
  ArrowRight,
  Loader2,
  Shield,
  Clock,
  Video,
} from "lucide-react";
import { MeetVideoPlayer } from "./MeetVideoPlayer";
import { MeetMediaControls } from "./MeetMediaControls";
import { MeetChatPanel } from "./MeetChatPanel";
import { MeetSignAssistPanel } from "./MeetSignAssistPanel";

// Demo component — replace hooks with your actual useSocket, useWebRTC, etc.
export const MeetVideoCall: React.FC = () => {
  // Demo state to simulate different screens
  const [screen, setScreen] = useState<"lobby" | "waiting" | "call">("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [signAssistEnabled, setSignAssistEnabled] = useState(false);
  const [mediaControls, setMediaControls] = useState({ video: true, audio: true });
  const [chatInputText, setChatInputText] = useState("");
  const [messages] = useState<
    { id: string; text: string; isOwn: boolean; timestamp: number }[]
  >([
    { id: "1", text: "Hey! Can you see me?", isOwn: false, timestamp: Date.now() - 60000 },
    { id: "2", text: "Yes, loud and clear! 👋", isOwn: true, timestamp: Date.now() - 30000 },
  ]);

  // Demo handlers
  const handleCreateRoom = () => {
    setRoomCode("XK7M2P");
    setScreen("waiting");
  };

  const handleJoinRoom = () => {
    if (joinInput.trim()) {
      setRoomCode(joinInput.trim());
      setScreen("call");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    setScreen("lobby");
    setRoomCode("");
    setJoinInput("");
  };

  const toggleVideo = () =>
    setMediaControls((c) => ({ ...c, video: !c.video }));
  const toggleAudio = () =>
    setMediaControls((c) => ({ ...c, audio: !c.audio }));

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ========= LOBBY ========= */}
      {screen === "lobby" && (
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
              <button
                onClick={handleCreateRoom}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-gmeet-blue hover:bg-gmeet-blue/90 rounded-full text-primary-foreground font-medium transition-all active:scale-[0.98]"
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
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  maxLength={6}
                  className="flex-1 px-4 py-3 bg-secondary rounded-full text-foreground placeholder-muted-foreground text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinInput.trim()}
                  className="px-5 py-3 rounded-full text-gmeet-blue font-medium text-sm hover:bg-gmeet-blue/10 disabled:text-muted-foreground disabled:hover:bg-transparent transition-all"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "Encrypted" },
                { icon: Clock, label: "Real-time" },
                { icon: Users, label: "1-on-1" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 py-3 rounded-lg bg-card/50 border border-border/50"
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
      {screen === "waiting" && (
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
                  onClick={handleCopyCode}
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
                  {copied ? "Copied to clipboard" : "Click to copy"}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleLeaveRoom}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-destructive hover:bg-destructive/10 text-sm font-medium transition-all"
              >
                <LogOut size={16} />
                Leave
              </button>
              {/* Demo: go to call */}
              <button
                onClick={() => setScreen("call")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gmeet-blue text-primary-foreground text-sm font-medium hover:bg-gmeet-blue/90 transition-all"
              >
                <ArrowRight size={16} />
                Preview call (demo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= CALL SCREEN ========= */}
      {screen === "call" && (
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
                  Room: {roomCode || "XK7M2P"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Video Area + Chat */}
          <div className="flex-1 flex min-h-0">
            {/* Video Grid */}
            <div className="flex-1 p-2 flex gap-2 min-h-0 relative">
              {/* Two videos side by side - GMeet style */}
              <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
                {/* Remote video (main) */}
                <MeetVideoPlayer
                  label="Remote User"
                  isVideoEnabled={true}
                  isPrimary
                />
                {/* Sign Assist overlay on top of video area */}
                {signAssistEnabled && (
                  <MeetSignAssistPanel
                    handDetected={false}
                    currentLetter={null}
                    currentPrediction={null}
                  />
                )}
              </div>

              <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-video">
                {/* Local video */}
                <MeetVideoPlayer
                  label="You"
                  muted
                  isVideoEnabled={mediaControls.video}
                  isLocal
                  isPrimary
                />
              </div>
            </div>

            {/* Chat Panel - slide out */}
            {isChatOpen && (
              <div className="w-80 flex-shrink-0 animate-fade-in">
                <MeetChatPanel
                  messages={messages}
                  onSendMessage={(text) => console.log("Send:", text)}
                  isChannelOpen={true}
                  inputText={chatInputText}
                  onInputTextChange={setChatInputText}
                  signAssistActive={signAssistEnabled}
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <div className="flex items-center justify-center py-4 flex-shrink-0">
            <div className="bg-control-bar rounded-full px-6 py-2 border border-border shadow-lg">
              <MeetMediaControls
                controls={mediaControls}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                onEndCall={handleLeaveRoom}
                signAssistEnabled={signAssistEnabled}
                onToggleSignAssist={() => setSignAssistEnabled(!signAssistEnabled)}
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
