// import { Send } from 'lucide-react';
// import { useEffect, useRef, useState } from 'react';
// import type { ChatMessage } from '../types/webrtc.types';

// interface ChatPanelProps {
//     messages: ChatMessage[];
//     onSendMessage: (text: string) => void;
//     isChannelOpen: boolean;
// }

// export const ChatPanel = ({
//     messages,
//     onSendMessage,
//     isChannelOpen
// }: ChatPanelProps) => {
//     const [inputMessage, setInputMessage] = useState('');
//     const messagesEndRef = useRef<HTMLDivElement>(null);

//     useEffect(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }, [messages]);

//     const handleSend = () => {
//         if (inputMessage.trim() && isChannelOpen) {
//             onSendMessage(inputMessage);
//             setInputMessage('');
//         }
//     };

//     const handleKeyPress = (e: React.KeyboardEvent) => {
//         if (e.key === 'Enter' && !e.shiftKey) {
//             e.preventDefault();
//             handleSend();
//         }
//     };

//     return (
//         <div className="w-80 h-96 bg-white border border-gray-300 rounded-lg flex flex-col">
//             <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 rounded-t-lg flex items-center justify-between">
//                 <h3 className="font-semibold text-gray-800">P2P Chat</h3>
//                 <span className={`text-xs px-2 py-1 rounded ${isChannelOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
//                     {isChannelOpen ? 'Connected' : 'Disconnected'}
//                 </span>
//             </div>

//             <div className="flex-1 overflow-y-auto p-4 space-y-2">
//                 {messages.length === 0 && (
//                     <div className="text-center text-gray-400 text-sm mt-8">
//                         No messages yet. Start chatting!
//                     </div>
//                 )}
//                 {messages.map((msg) => (
//                     <div
//                         key={msg.id}
//                         className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
//                     >
//                         <div
//                             className={`max-w-[70%] px-3 py-2 rounded-lg ${msg.isOwn
//                                 ? 'bg-blue-500 text-white'
//                                 : 'bg-gray-200 text-gray-800'
//                                 }`}
//                         >
//                             <p className="text-sm break-words">{msg.text}</p>
//                             <span className="text-xs opacity-70">
//                                 {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                             </span>
//                         </div>
//                     </div>
//                 ))}
//                 <div ref={messagesEndRef} />
//             </div>

//             <div className="p-3 border-t border-gray-300">
//                 <div className="flex gap-2">
//                     <input
//                         type="text"
//                         value={inputMessage}
//                         onChange={(e) => setInputMessage(e.target.value)}
//                         onKeyDown={handleKeyPress}
//                         placeholder={isChannelOpen ? "Type a message..." : "Waiting for connection..."}
//                         disabled={!isChannelOpen}
//                         className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
//                     />
//                     <button
//                         onClick={handleSend}
//                         disabled={!inputMessage.trim() || !isChannelOpen}
//                         className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
//                     >
//                         <Send size={20} />
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/webrtc.types';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isChannelOpen: boolean;
}

export const ChatPanel = ({
    messages,
    onSendMessage,
    isChannelOpen
}: ChatPanelProps) => {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (inputMessage.trim() && isChannelOpen) {
            onSendMessage(inputMessage);
            setInputMessage('');
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
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isChannelOpen ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
                    {isChannelOpen ? '● Connected' : '○ Offline'}
                </span>
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
                                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                                    msg.isOwn
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
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={isChannelOpen ? "Type your message..." : "Waiting for connection..."}
                        disabled={!isChannelOpen}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputMessage.trim() || !isChannelOpen}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-xl hover:shadow-lg disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};