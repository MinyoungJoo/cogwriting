import useStore from '@/store/useStore';
import { Sparkles, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { selectStrategy } from '@/src/lib/strategy';

import UnblockingCards from './UnblockingCards';

export default function AssistPanel() {
    const {
        chatMessages,
        addChatMessage,
        selectedStrategy,
        interventionStatus,
        triggerIntervention,
        content,
        phase,
        cognitiveState
    } = useStore();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Calculate potential strategy for display
    const potentialStrategy = selectStrategy(phase, cognitiveState);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user' as const, content: input };
        addChatMessage(userMessage);
        setInput('');
        setIsLoading(true);

        try {
            const payload = {
                strategy_id: potentialStrategy?.id || 'CHAT_DEFAULT',
                system_instruction: potentialStrategy?.systemInstruction || 'You are a helpful writing assistant. Respond in Korean.',
                writing_context: content,
                trigger_reason: 'USER_PROMPT',
                user_prompt: input
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.suggestion_content) {
                addChatMessage({
                    role: 'assistant',
                    content: data.suggestion_content
                });
            } else {
                addChatMessage({
                    role: 'assistant',
                    content: "I'm thinking... (Decision: WAIT)"
                });
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            addChatMessage({
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-[350px] bg-gray-900 text-white flex flex-col border-l border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Assist Agent
                </h2>
                <div className="text-xs text-gray-500">
                    {selectedStrategy ? selectedStrategy.replace('S1_', '').replace('S2_', '') : 'Ready'}
                </div>
            </div>

            {/* Manual Trigger Button */}
            {interventionStatus === 'detected' && (
                <div className="p-4 bg-blue-900/20 border-b border-blue-800/50">
                    <button
                        onClick={() => triggerIntervention()}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-md flex flex-col items-center justify-center gap-1 transition-colors animate-pulse"
                    >
                        <div className="flex items-center gap-2 font-bold">
                            <Sparkles className="w-4 h-4" />
                            AI Suggestion Available
                        </div>
                        <div className="text-[10px] uppercase tracking-wider opacity-80">
                            {potentialStrategy ? potentialStrategy.id.replace('S1_', '').replace('S2_', '').replace('_', ' ') : 'Ready'}
                        </div>
                    </button>
                </div>
            )}

            {/* Loading State */}
            {interventionStatus === 'requesting' && (
                <div className="p-4 text-center text-gray-400 animate-pulse">
                    Generating suggestion...
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'assistant' && msg.strategy && (
                            <div className="text-[10px] text-gray-500 mb-1 ml-1 uppercase tracking-wider">
                                {msg.strategy.replace('S1_', '').replace('S2_', '').replace('_', ' ')}
                            </div>
                        )}
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-200 border border-gray-700'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 p-3 rounded-lg rounded-bl-none flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask for help..."
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-white placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
