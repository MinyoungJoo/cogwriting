import React, { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { ChevronLeft, Keyboard, MessageSquare, Laptop2, FileText } from 'lucide-react';

interface DetailedLog {
    events: Array<{
        t: number;
        k: string;
        type: string;
        pos: number;
    }>;
    createdAt: string;
}

interface InteractionLog {
    _id: string;
    cognitive_type: 'S1' | 'S2';
    initiative: 'SI' | 'UI';
    feature_type: string;
    user_action: string;
    writing_context?: string; // [NEW]
    focal_segment?: string;   // [NEW]
    ai_response?: any;
    timestamp: string;
}

interface ChatLogEntry {
    _id: string;
    strategy_id: string; // [NEW] Added strategy_id
    messages: Array<{
        role: string;
        content: string;
        timestamp: string;
    }>;
    createdAt: string;
}


interface LogViewerProps {
    sessionId: string;
    onBack: () => void;
}

export default function LogViewer({ sessionId, onBack }: LogViewerProps) {
    const [activeTab, setActiveTab] = useState<'keystrokes' | 'interactions' | 'chat' | 'content'>('keystrokes');
    const [logs, setLogs] = useState<DetailedLog[]>([]);
    const [interactions, setInteractions] = useState<InteractionLog[]>([]);
    const [chatLogs, setChatLogs] = useState<ChatLogEntry[]>([]);
    const [sessionData, setSessionData] = useState<any>(null); // [NEW] Store full session data
    const [loading, setLoading] = useState(true);
    const [filterStrategy, setFilterStrategy] = useState<string>('ALL');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [logData, interactionData, chatData, sData] = await Promise.all([
                    api.logs.get(sessionId),
                    api.logs.getInteractions(sessionId),
                    api.logs.getChatLogs(sessionId),
                    api.sessions.get(sessionId) // [NEW] Fetch session details
                ]);
                setLogs(logData);
                setInteractions(interactionData);
                setChatLogs(chatData);
                setSessionData(sData);

                // Set initial filter to first strategy if available
                if (chatData.length > 0) {
                    const firstStrat = chatData[0].strategy_id || 'GENERAL';
                    setFilterStrategy(firstStrat);
                } else {
                    setFilterStrategy('GENERAL'); // Default
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [sessionId]);

    if (loading) return <div className="text-gray-400 p-4">Loading logs...</div>;

    // Aggregate Keystrokes
    const allEvents = logs.flatMap(l => l.events);
    const totalKeys = allEvents.length;
    const deletes = allEvents.filter(e => e.type === 'DELETE').length;
    const deleteRatio = totalKeys ? ((deletes / totalKeys) * 100).toFixed(1) : '0';

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-2"
            >
                <ChevronLeft size={16} /> Back to Sessions
            </button>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Keystrokes</div>
                    <div className="text-2xl font-bold text-white font-mono">{totalKeys}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Errors (Deletes)</div>
                    <div className="text-2xl font-bold text-red-400 font-mono">{deletes} <span className="text-sm text-gray-500 font-normal">({deleteRatio}%)</span></div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Interactions</div>
                    <div className="text-2xl font-bold text-blue-400 font-mono">{interactions.length}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chat Sessions</div>
                    <div className="text-2xl font-bold text-purple-400 font-mono">{chatLogs.length}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('keystrokes')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'keystrokes' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                        } flex items-center gap-2`}
                >
                    <Keyboard size={14} /> Keystrokes
                </button>
                <button
                    onClick={() => setActiveTab('interactions')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'interactions' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                        } flex items-center gap-2`}
                >
                    <Laptop2 size={14} /> Interactions
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'chat' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                        } flex items-center gap-2`}
                >
                    <MessageSquare size={14} /> Chat Logs
                </button>
                <button
                    onClick={() => setActiveTab('content')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'content' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                        } flex items-center gap-2`}
                >
                    <FileText size={14} /> Final Draft
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl h-[600px] flex flex-col">
                {activeTab === 'keystrokes' && (
                    <div className="flex-1 overflow-y-auto p-2 bg-black font-mono text-xs">
                        <table className="w-full text-left text-gray-400 border-collapse">
                            <thead className="text-gray-600 sticky top-0 bg-black z-10 border-b border-gray-800">
                                <tr>
                                    <th className="p-2 w-24">Time (ms)</th>
                                    <th className="p-2 w-20">Type</th>
                                    <th className="p-2 w-24">Key</th>
                                    <th className="p-2">Pos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allEvents.map((evt, idx) => (
                                    <tr key={idx} className="hover:bg-gray-900/50 border-b border-gray-900/30">
                                        <td className="p-2 text-gray-500">{evt.t.toFixed(0)}</td>
                                        <td className="p-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${evt.type === 'DELETE' ? 'bg-red-900/30 text-red-400 border border-red-900/50' :
                                                evt.type === 'NC' ? 'bg-yellow-900/30 text-yellow-500 border border-yellow-900/50' :
                                                    'bg-green-900/30 text-green-400 border border-green-900/50'
                                                }`}>
                                                {evt.type}
                                            </span>
                                        </td>
                                        <td className="p-2 text-gray-200 font-bold">{evt.k === ' ' ? 'Space' : evt.k}</td>
                                        <td className="p-2 text-gray-500">{evt.pos}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'interactions' && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
                        {interactions.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">No interactions recorded.</div>
                        ) : (
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="text-xs uppercase text-gray-500 bg-gray-800/50 border-b border-gray-700">
                                    <tr>
                                        <th className="p-3">Time</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Initiative</th>
                                        <th className="p-3">Feature</th>
                                        <th className="p-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {interactions.map((int) => (
                                        <React.Fragment key={int._id}>
                                            <tr className="hover:bg-gray-800/30 font-medium">
                                                <td className="p-3 font-mono text-gray-500 text-xs">
                                                    {new Date(int.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${int.cognitive_type === 'S1' ? 'bg-green-900/20 text-green-400' : 'bg-orange-900/20 text-orange-400'}`}>
                                                        {int.cognitive_type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-xs">
                                                    {int.initiative === 'SI' ? (
                                                        <span className="text-blue-400 font-semibold">System (Nudge)</span>
                                                    ) : (
                                                        <span className="text-gray-400">User</span>
                                                    )}
                                                </td>
                                                <td className="p-3 font-medium text-white">{int.feature_type}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${int.user_action === 'ACCEPT' ? 'bg-blue-600 text-white' :
                                                        int.user_action === 'REJECT' ? 'bg-red-900/50 text-red-400' :
                                                            'bg-gray-700 text-gray-400'
                                                        }`}>
                                                        {int.user_action}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Details Row */}
                                            <tr className="bg-gray-900/50 border-b border-gray-800/50">
                                                <td colSpan={5} className="p-3 pt-0 pb-4">
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        {/* Context Column */}
                                                        <div className="space-y-2">
                                                            {int.focal_segment && (
                                                                <div className="bg-gray-950 p-2 rounded border border-gray-800">
                                                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Target Segment</div>
                                                                    <div className="text-gray-300 italic">"{int.focal_segment}"</div>
                                                                </div>
                                                            )}
                                                            <div className="bg-gray-950 p-2 rounded border border-gray-800 max-h-32 overflow-y-auto">
                                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Full Writing Context</div>
                                                                <div className="text-gray-400 font-mono whitespace-pre-wrap">{int.writing_context || '(No context)'}</div>
                                                            </div>
                                                        </div>

                                                        {/* AI Response Column */}
                                                        <div className="bg-blue-900/10 p-2 rounded border border-blue-900/30 max-h-48 overflow-y-auto">
                                                            <div className="text-[10px] text-blue-400 uppercase font-bold mb-1">AI Response</div>
                                                            <pre className="text-gray-300 whitespace-pre-wrap font-sans text-xs">
                                                                {int.ai_response ? JSON.stringify(int.ai_response, null, 2) : '(No response recorded)'}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="flex h-full">
                        {/* Strategy Sidebar */}
                        <div className="w-48 border-r border-gray-800 bg-black/20 overflow-y-auto p-2 shrink-0">
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 px-2">Strategies</div>
                            {['ALL', ...Array.from(new Set(chatLogs.map(l => l.strategy_id || 'GENERAL')))].map(strat => (
                                <button
                                    key={strat}
                                    onClick={() => setFilterStrategy(strat)}
                                    className={`w-full text-left px-3 py-2 rounded text-xs mb-1 transition-colors ${filterStrategy === strat
                                        ? 'bg-purple-900/40 text-purple-300 border border-purple-800'
                                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                        }`}
                                >
                                    {strat}
                                </button>
                            ))}
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-950 space-y-6">
                            {chatLogs.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">No chat history found.</div>
                            ) : (
                                chatLogs
                                    .filter(log => filterStrategy === 'ALL' || (log.strategy_id || 'GENERAL') === filterStrategy)
                                    .map((log) => (
                                        <div key={log._id} className="border border-gray-800 rounded-lg p-4 bg-gray-900/30">
                                            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                                                <div className="text-xs text-gray-500 font-mono">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </div>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                                                    {log.strategy_id || 'GENERAL'}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {log.messages.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] rounded-lg p-3 text-sm leading-relaxed ${msg.role === 'user'
                                                            ? 'bg-blue-900/30 text-blue-100 border border-blue-900/50'
                                                            : msg.role === 'assistant'
                                                                ? 'bg-gray-800 text-gray-200 border border-gray-700'
                                                                : 'bg-red-900/20 text-red-300 text-xs italic'
                                                            }`}>
                                                            <div className="font-bold text-[10px] mb-1 opacity-50 uppercase">{msg.role}</div>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                            )}
                            {chatLogs.filter(log => filterStrategy === 'ALL' || (log.strategy_id || 'GENERAL') === filterStrategy).length === 0 && (
                                <div className="text-center text-gray-500 mt-10">No logs for this strategy.</div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'content' && (
                    <div className="flex-1 overflow-y-auto p-8 bg-white text-gray-900 leading-relaxed font-serif">
                        <div className="max-w-3xl mx-auto whitespace-pre-wrap text-lg">
                            {sessionData?.content || sessionData?.final_text ? (
                                sessionData?.content || sessionData?.final_text
                            ) : (
                                <div className="text-center text-gray-400italic mt-20">No final draft content saved.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
