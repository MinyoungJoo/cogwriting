import useStore from '@/store/useStore';
import { api } from '@/src/lib/api';
import { Sparkles, Send, MessageSquare, Search, LayoutList, UserCheck, BookOpen, Palette, Play, FileText, Wrench } from 'lucide-react';
import { useState, useRef, useEffect, Fragment } from 'react';
import { selectStrategy, getStrategy } from '@/src/lib/strategy';
import { monitorAgent } from '@/src/lib/MonitorAgent';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AssistPanel() {
    const {
        chatSessions,
        addChatMessage,
        selectedStrategy,
        interventionStatus,
        triggerIntervention,
        content,
        phase,
        cognitiveState,
        setSelectedStrategy,
        setPendingPayload,
        setStruggleDetected, // Import setStruggleDetected
        setIdeaSparkDetected, // [FIX] Import setIdeaSparkDetected
        unreadDiagnosis, // [NEW] Import unreadDiagnosis
        markDiagnosisRead // [NEW] Import markDiagnosisRead
    } = useStore();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Calculate potential strategy for display
    const potentialStrategy = selectStrategy(phase, cognitiveState);

    // Determine current session messages
    const currentSessionId = selectedStrategy || 'GENERAL';
    const currentMessages = chatSessions[currentSessionId] || [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const sessionId = useStore.getState().sessionId;
        const participantId = useStore.getState().participantId;

        const userMessage = { role: 'user' as const, content: input };
        addChatMessage(userMessage, currentSessionId);
        setInput('');
        setIsLoading(true);

        // Save User Message to DB
        console.log('[AssistPanel] Saving Chat Log for Session:', sessionId);
        if (sessionId) {
            try {
                await api.logs.saveChatLog({
                    session_id: sessionId,
                    participant_id: participantId || 'anonymous',
                    strategy_id: currentSessionId, // [NEW] Pass the current strategy ID
                    messages: [{
                        role: 'user',
                        content: userMessage.content,
                        timestamp: new Date()
                    }]
                });
            } catch (e) {
                console.error('Failed to log user message', e);
            }
        }

        try {
            // Use selected strategy if available, otherwise potential strategy
            const strategyId = selectedStrategy || potentialStrategy?.id || 'CHAT_DEFAULT';
            const strategyDef = getStrategy(strategyId as any);

            const payload = {
                strategy_id: strategyId,
                system_instruction: strategyDef?.systemInstruction || 'You are a helpful writing assistant. Respond in Korean.',
                writing_context: content,
                trigger_reason: 'USER_PROMPT',
                user_prompt: input,
                chat_history: currentMessages,
                context_data: {
                    fullText: content,
                    focalSegment: content, // For general chat, treat whole text as focal
                    userGoal: useStore.getState().userGoal,
                    writingGenre: useStore.getState().writingGenre,
                    writingTopic: useStore.getState().writingTopic,
                    writingAudience: useStore.getState().writingAudience,
                    sessionId: sessionId // [NEW] Pass Session ID for Context Hydration
                }
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

            const responseContent = data.suggestion_content || data.message || data.content;

            if (responseContent) {
                const aiMessage = {
                    role: 'assistant' as const,
                    content: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
                    strategy: strategyId
                };
                addChatMessage(aiMessage, currentSessionId);

                // Save AI Message to DB
                if (sessionId) {
                    try {
                        await api.logs.saveChatLog({
                            session_id: sessionId,
                            participant_id: participantId || 'anonymous',
                            strategy_id: currentSessionId, // [NEW] Pass the current strategy ID
                            messages: [{
                                role: 'assistant',
                                content: aiMessage.content,
                                timestamp: new Date()
                            }]
                        });
                    } catch (e) {
                        console.error('Failed to log AI message', e);
                    }
                }
            } else {
                // Only show WAIT if truly no content found
                addChatMessage({
                    role: 'assistant',
                    content: "I'm thinking... (Decision: WAIT)"
                }, currentSessionId);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            addChatMessage({
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }, currentSessionId);
        } finally {
            setIsLoading(false);
        }
    };

    // Only select the strategy, do not trigger


    useEffect(() => {
        if (selectedStrategy && unreadDiagnosis[selectedStrategy]) {
            // Wait for visual effect then mark read
            const timer = setTimeout(() => {
                markDiagnosisRead(selectedStrategy);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [selectedStrategy, unreadDiagnosis, markDiagnosisRead]);

    // Manual Trigger for Analysis
    const handleRunAnalysis = (overrideStrategyId?: string) => {
        const targetStrategy = overrideStrategyId || selectedStrategy;
        if (!targetStrategy) return;

        console.log(`Running Analysis for: ${targetStrategy}`);
        const payload = monitorAgent.manual_trigger(`Review Request: ${targetStrategy}`);

        // FORCE FULL CONTEXT for Chat Analysis
        // User requested that chat interactions should have access to the full text
        payload.writing_context = content;

        setPendingPayload(payload);
        triggerIntervention();
    };

    const tools = [
        { id: 'S1_IDEA_SPARK', label: 'Idea Spark', icon: Sparkles, desc: '아이디어 발상', color: 'yellow' },
        { id: 'S2_DIAGNOSIS', label: 'Diagnosis', icon: FileText, desc: '진단', color: 'yellow' },
        { id: 'S2_LOGIC_AUDITOR', label: 'Logic', icon: Search, desc: '논리 점검' },
        { id: 'S2_STRUCTURAL_MAPPING', label: 'Structure', icon: LayoutList, desc: '구조 시각화' },
        { id: 'S2_TONE_REFINEMENT', label: 'Tone', icon: Palette, desc: '어조 정제' },

    ];

    const EDITOR_STRATEGIES = [
        'S1_GAP_FILLING',
        'S1_PARAPHRASING',
        'S1_IDEA_EXPANSION',
        'S1_PATTERN_BREAKER'
    ];

    // Only select the strategy, do not trigger
    const handleToolSelect = (strategyId: any) => {
        console.log(`Tool Selected: ${strategyId}`);

        // [FIX] Diagnosis is an ACTION, not a persistent mode.
        // It triggers the StruggleNudge UI but does NOT open a chat window.
        // It should be re-clickable immediately.
        if (strategyId === 'S2_DIAGNOSIS') {
            setIdeaSparkDetected(false); // Force clear conflicting state
            setStruggleDetected(true);   // Show Nudge UI
            return; // Do NOT set selectedStrategy
        }

        // [NEW] Idea Spark Manual Trigger (Icon Click)
        if (strategyId === 'S1_IDEA_SPARK') {
            setStruggleDetected(false); // Force clear conflicting state
            // Reset cooldown to allow immediate trigger
            monitorAgent.resetCooldown('IDEA_SPARK');
            setIdeaSparkDetected(true); // Show Idea Spark UI

            const payload = monitorAgent.manual_trigger('Help me find ideas');
            setPendingPayload(payload);

            // Allow UI to position itself (defaulting to center/top if no cursor logic here yet)
            triggerIntervention(undefined, 'S1_IDEA_SPARK');
            return;
        }

        setSelectedStrategy(strategyId);

        // Auto-run logic removed as per user request.
        // Users must click 'Run Analysis' unless triggered by Diagnose Nudge.
    };

    const isEditorStrategy = selectedStrategy && EDITOR_STRATEGIES.includes(selectedStrategy);

    return (
        <div className="w-[400px] bg-gray-900 text-white flex border-l border-gray-800">
            {/* Sidebar */}
            <div className="w-14 flex flex-col items-center py-4 border-r border-gray-800 gap-4 bg-gray-950">
                <div className="mb-2">
                    <Wrench className="w-6 h-6 text-white" />
                </div>

                {/* S2 Tools */}
                {/* S2 Tools */}
                {tools.map((tool, index) => (
                    <Fragment key={tool.id}>
                        <button
                            onClick={() => handleToolSelect(tool.id)}
                            className={`p-2 rounded-lg transition-colors group relative ${selectedStrategy === tool.id
                                ? 'bg-blue-600 text-white'
                                : tool.color === 'yellow'
                                    ? 'text-yellow-400 hover:text-yellow-100 hover:bg-yellow-900/40' // Enhanced Diagnosis style
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                            title={tool.desc}
                        >
                            <tool.icon className="w-5 h-5" />

                            {/* Unread Indicator (Sparkle) */}
                            {unreadDiagnosis[tool.id] && selectedStrategy !== tool.id && (
                                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                                </span>
                            )}

                            {/* Tooltip */}
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 border border-gray-700">
                                {tool.label}
                            </div>
                        </button>
                        {/* Divider after Diagnosis (Second item) */}
                        {index === 1 && <div className="w-8 h-px bg-gray-800 shrink-0" />}
                    </Fragment>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        {selectedStrategy && !isEditorStrategy ? tools.find(t => t.id === selectedStrategy)?.label || 'Assist Agent' : 'Assist Agent'}
                    </h2>
                    {interventionStatus === 'requesting' && !isEditorStrategy && (
                        <span className="text-xs text-blue-400 animate-pulse">Processing...</span>
                    )}
                </div>

                {/* Analysis Trigger Button (Only when S2 strategy selected AND NOT Diagnosis) */}
                {selectedStrategy && selectedStrategy.startsWith('S2_') && selectedStrategy !== 'S2_DIAGNOSIS' && (
                    <div className="p-3 bg-gray-800/50 border-b border-gray-800">
                        <button
                            onClick={() => handleRunAnalysis()}
                            disabled={interventionStatus === 'requesting'}
                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Run Analysis</span>
                        </button>
                    </div>
                )}



                {/* Chat Area - Only show if S2 strategy is selected AND NOT Diagnosis */}
                {selectedStrategy && selectedStrategy.startsWith('S2_') && selectedStrategy !== 'S2_DIAGNOSIS' ? (
                    <>
                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 relative ${useStore.getState().unreadDiagnosis[selectedStrategy] ? 'animate-pulse bg-yellow-900/10' : ''
                            }`}
                            onAnimationEnd={() => useStore.getState().markDiagnosisRead(selectedStrategy)}
                        >
                            {/* Sparkle Overlay for Unread */}


                            {currentMessages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {msg.role === 'assistant' && msg.strategy && (
                                        <div className="text-[10px] text-gray-500 mb-1 ml-1 uppercase tracking-wider flex items-center gap-1">
                                            {msg.strategy === 'S2_DIAGNOSIS' ? (
                                                <FileText className="w-3 h-3 text-yellow-500" />
                                            ) : (
                                                <Sparkles className="w-3 h-3" />
                                            )}

                                            {msg.strategy.replace('S1_', '').replace('S2_', '').replace(/_/g, ' ')}
                                        </div>
                                    )}
                                    <div className={`max-w-[90%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-200 border border-gray-700'
                                        }`}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                                                code: ({ node, ...props }) => <code className="bg-gray-900 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-800 p-3 rounded-lg rounded-bl-none flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-gray-800 bg-gray-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask for help..."
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-white placeholder-gray-400"
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
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                        <Wrench className="w-12 h-12 mb-4 text-gray-700" />
                        <h3 className="text-lg font-medium text-gray-400 mb-2">Assist Agent</h3>
                        <p className="text-sm">
                            좌측 메뉴에서 도구를 선택하거나<br />
                            AI가 문제를 감지하면 자동으로 활성화됩니다.
                        </p>
                    </div>
                )}
            </div>
        </div >
    );
}
