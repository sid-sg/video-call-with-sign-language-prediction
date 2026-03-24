import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/webrtc.types';
import AiIcon from '../assets/ai.svg?react';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isChannelOpen: boolean;
    inputText: string;
    onInputTextChange: (text: string) => void;
    signAssistActive?: boolean;
}

export const ChatPanel = ({
    messages,
    onSendMessage,
    isChannelOpen,
    inputText,
    onInputTextChange,
    signAssistActive = false,
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
        <div className="flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">💬</div>
                    <h3 className="font-bold text-white text-lg">P2P Chat</h3>
                </div>
                <div className="flex items-center gap-2">
                    {signAssistActive && (
                        <span className="text-xs px-3 py-1 rounded-full bg-green-400 text-green-900 font-semibold">
                            ✋ Sign Mode
                        </span>
                    )}
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isChannelOpen ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
                        {isChannelOpen ? '● Connected' : '○ Offline'}
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-gray-50 to-white min-h-0">
                {messages.length === 0 ? (
                    <div className="text-center mt-16">
                        <div className="text-6xl mb-4 opacity-20">💬</div>
                        <p className="text-gray-400 font-semibold">No messages yet</p>
                        <p className="text-gray-300 text-sm mt-2">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${msg.isOwn
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                                    }`}
                            >
                                <p className="text-sm break-words leading-relaxed">{msg.text}</p>
                                <span className={`text-xs mt-1 block ${msg.isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                {signAssistActive && (
                    <div className="mb-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2 text-green-700">
                            <span className="text-lg">✋</span>
                            <span className="text-xs font-semibold">Sign Assist Active - Letters will appear here as you sign</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => onInputTextChange(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={isChannelOpen ? (signAssistActive ? "Sign or type your message..." : "Type your message...") : "Waiting for connection..."}
                            disabled={!isChannelOpen}
                            className={`w-full px-4 py-3 pr-14 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 placeholder-gray-400 ${signAssistActive
                                    ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-green-50'
                                    : 'border-gray-300 focus:ring-purple-500 focus:border-transparent bg-white'
                                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        />
                        {/* AI Improve Button */}
                        {inputText.trim() && (
                            <button
                                onClick={handleImproveText}
                                disabled={isImproving || !isChannelOpen}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-lg hover:shadow-lg disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-110 active:scale-95"
                                title="Improve text with AI"
                            >
                                {isImproving ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <AiIcon className="h-7 w-7 text-white" />
                                )}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || !isChannelOpen}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-xl hover:shadow-lg disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>

                <div className="mt-2 text-xs text-gray-500 text-center">
                    {signAssistActive
                        ? '💡 Use sign language or keyboard - press Enter to send'
                        : '💬 Type a message and press Enter to send'
                    }
                </div>
            </div>
        </div>
    );
};