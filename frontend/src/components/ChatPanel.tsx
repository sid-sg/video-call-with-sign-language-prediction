import { Send, X, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/webrtc.types';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isChannelOpen: boolean;
    inputText: string;
    onInputTextChange: (text: string) => void;
    signAssistActive?: boolean;
    onClose?: () => void;
}

export const ChatPanel = ({
    messages,
    onSendMessage,
    isChannelOpen,
    inputText,
    onInputTextChange,
    signAssistActive = false,
    onClose,
}: ChatPanelProps) => {
    const [isImproving, setIsImproving] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (signAssistActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [signAssistActive]);

    const handleSend = () => {
        if (inputText.trim() && isChannelOpen) {
            onSendMessage(inputText);
            onInputTextChange('');
        }
    };

    const handleImproveText = async () => {
        if (!inputText.trim() || isImproving) return;

        setIsImproving(true);
        try {
            const response = await fetch('https://webrtc-video-calling-demo.onrender.com/api/improve-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: inputText }),
            });

            if (response.ok) {
                const data = await response.json();
                const improved = data.improvedText || inputText;
                onInputTextChange(improved);
            } else {
                console.error('Failed to improve text');
            }
        } catch (error) {
            console.error('Error improving text:', error);
        } finally {
            setIsImproving(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-card border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <h3 className="text-foreground font-medium text-base">In-call messages</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                        <X size={18} className="text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Connection status */}
            <div className="px-4 py-2 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isChannelOpen ? 'bg-gmeet-green' : 'bg-destructive'
                        }`}
                    />
                    <span className="text-xs text-muted-foreground">
                        {isChannelOpen ? 'Connected' : 'Connecting...'}
                    </span>
                    {signAssistActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gmeet-green-20 text-gmeet-green font-medium ml-auto">
                            ✋ Sign Mode
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-muted-foreground text-sm">
                            Messages can only be seen by people in the call and are deleted when the call ends.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`animate-fade-in flex flex-col ${
                                msg.isOwn ? 'items-end' : 'items-start'
                            }`}
                        >
                            <span className="text-xs text-muted-foreground mb-1 px-1">
                                {msg.isOwn ? 'You' : 'Peer'}
                                {' · '}
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                            <div
                                className={`max-w-[85%] px-3.5 py-2 text-sm leading-relaxed break-words ${
                                    msg.isOwn
                                        ? 'bg-gmeet-blue text-white rounded-2xl rounded-br-sm'
                                        : 'bg-secondary text-foreground rounded-2xl rounded-bl-sm'
                                }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Sign Assist indicator */}
            {signAssistActive && (
                <div className="px-4 py-2 border-t border-border flex-shrink-0">
                    <div className="flex items-center gap-2 text-gmeet-green">
                        <span className="text-sm">✋</span>
                        <span className="text-xs font-medium">Sign Assist — letters appear as you sign</span>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => onInputTextChange(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={
                                isChannelOpen
                                    ? signAssistActive
                                        ? 'Sign or type...'
                                        : 'Send a message'
                                    : 'Waiting for connection...'
                            }
                            disabled={!isChannelOpen}
                            className={`w-full px-3 py-2.5 rounded-full text-sm bg-secondary text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                inputText.trim() ? 'pr-10' : ''
                            }`}
                            style={{ color: 'hsl(var(--foreground))' }}
                        />
                        {/* AI Improve button */}
                        {inputText.trim() && (
                            <button
                                onClick={handleImproveText}
                                disabled={isImproving || !isChannelOpen}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gmeet-blue flex items-center justify-center hover:bg-gmeet-blue-90 disabled:opacity-50 transition-all"
                                title="Improve text with AI"
                            >
                                {isImproving ? (
                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <Sparkles size={14} className="text-primary-foreground" />
                                )}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || !isChannelOpen}
                        className="w-10 h-10 rounded-full bg-gmeet-blue flex items-center justify-center hover:bg-gmeet-blue-90 disabled:bg-secondary disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={16} className="text-primary-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
};