'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Activity, Keyboard, AlertTriangle, Play, Pause } from 'lucide-react';
import Link from 'next/link';

// === Types ===
interface Session {
    _id: string;
    createdAt: string;
    meta: {
        writing_genre?: string;
        user_goal?: string;
    };
}

interface Interaction {
    _id: string;
    timestamp: string;
    feature_type: string;
    trigger_metrics: {
        revision_ratio: number;
        pause_duration: number;
        cpm: number;
    };
    user_action: string;
    writing_context?: string;
    focal_segment?: string;
    ai_response?: any;
    trigger_reason?: string; // Sometimes in payload
}

interface KeystrokeEvent {
    t: number; // millisecond timestamp relative to session start or absolute? 
    // Looking at logs/route.ts, it seems to be absolute or relative depending on client.
    // MonitorAgent sends Date.now().
    k: string;
    type: 'INPUT' | 'DELETE' | 'NC';
    pos: number;
}

interface KeystrokeLogDoc {
    events: KeystrokeEvent[];
}

export default function LogViewerPage() {
    // === State ===
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');

    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);

    const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
    const [loading, setLoading] = useState(false);

    // === Fetch Sessions ===
    useEffect(() => {
        fetch('/api/sessions?limit=50')
            .then(res => res.json())
            .then(data => {
                if (data.sessions) {
                    setSessions(data.sessions);
                    if (data.sessions.length > 0) {
                        setSelectedSessionId(data.sessions[0]._id);
                    }
                }
            })
            .catch(err => console.error(err));
    }, []);

    // === Fetch Data on Session Change ===
    useEffect(() => {
        if (!selectedSessionId) return;
        setLoading(true);
        setSelectedInteraction(null);

        Promise.all([
            fetch(`/api/interactions?session_id=${selectedSessionId}`).then(res => res.json()),
            fetch(`/api/logs?session_id=${selectedSessionId}`).then(res => res.json())
        ]).then(([interactionsData, logsData]) => {
            // Logs data might be an array of chunks (Document[])
            const allEvents: KeystrokeEvent[] = [];
            if (Array.isArray(logsData)) {
                logsData.forEach((doc: KeystrokeLogDoc) => {
                    if (doc.events) allEvents.push(...doc.events);
                });
            }
            // Sort by time
            allEvents.sort((a, b) => a.t - b.t);

            setInteractions(interactionsData);
            setKeystrokes(allEvents);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });

    }, [selectedSessionId]);

    // === Helper: Get Keystrokes around Interaction ===
    const getCorrelatedKeystrokes = (interaction: Interaction) => {
        if (!interaction || keystrokes.length === 0) return [];

        const triggerTime = new Date(interaction.timestamp).getTime();
        const windowStart = triggerTime - 30000; // 30 seconds before
        const windowEnd = triggerTime + 5000;    // 5 seconds after (reaction)

        return keystrokes.filter(k => k.t >= windowStart && k.t <= windowEnd);
    };

    const correlatedKeys = selectedInteraction ? getCorrelatedKeystrokes(selectedInteraction) : [];

    // === Render ===
    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Debug Log Viewer
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Session:</span>
                    <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[300px]"
                    >
                        {sessions.map(s => (
                            <option key={s._id} value={s._id}>
                                {new Date(s.createdAt).toLocaleString()} - {s.meta?.writing_genre || 'Untitled'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">

                {/* Left: Interactions List */}
                <div className="col-span-4 bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-800 bg-gray-900 sticky top-0">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Activity size={16} className="text-blue-400" />
                            Interventions ({interactions.length})
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Loading data...</div>
                        ) : interactions.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No interventions found.</div>
                        ) : (
                            interactions.map(int => (
                                <button
                                    key={int._id}
                                    onClick={() => setSelectedInteraction(int)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedInteraction?._id === int._id
                                            ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                                            : 'bg-gray-800/30 border-transparent hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${int.feature_type === 'STRUGGLE_NUDGE' ? 'bg-red-500/20 text-red-300' :
                                                int.feature_type === 'IDEA_SPARK' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    'bg-blue-500/20 text-blue-300'
                                            }`}>
                                            {int.feature_type}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            {new Date(int.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                        <span>User: <b className={int.user_action === 'ACCEPT' ? 'text-green-400' : int.user_action === 'REJECT' ? 'text-red-400' : 'text-gray-500'}>{int.user_action}</b></span>
                                        {int.trigger_metrics && (
                                            <span>R-Ratio: <b className={int.trigger_metrics.revision_ratio < 0.4 ? 'text-red-400' : 'text-gray-300'}>{int.trigger_metrics.revision_ratio?.toFixed(2)}</b></span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Analysis View */}
                <div className="col-span-8 flex flex-col gap-6">

                    {/* Top: Trigger Context */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex-1 overflow-hidden flex flex-col">
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-400 uppercase font-semibold">
                            <Clock size={16} />
                            Context at Trigger
                        </div>
                        {selectedInteraction ? (
                            <div className="flex-1 overflow-y-auto bg-black/30 rounded-lg p-4 font-serif text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {selectedInteraction.writing_context || '(No context snapshot available)'}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600">
                                Select an intervention to view details
                            </div>
                        )}
                    </div>

                    {/* Bottom: Keystroke Timeline */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-400 uppercase font-semibold">
                                <Keyboard size={16} />
                                Keystroke History (-30s ~ +5s)
                            </div>
                            <span className="text-xs text-gray-500">
                                {correlatedKeys.length} events
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-black/30 rounded-lg p-2 font-mono text-xs space-y-1 relative">
                            {correlatedKeys.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-600">
                                    {selectedInteraction ? 'No keystrokes found in this window.' : 'Select an intervention to correlate.'}
                                </div>
                            ) : (
                                correlatedKeys.map((k, idx) => {
                                    // Calculate relative time from trigger
                                    const triggerTime = selectedInteraction ? new Date(selectedInteraction.timestamp).getTime() : 0;
                                    const relTime = (k.t - triggerTime) / 1000;
                                    const isTriggerMoment = Math.abs(relTime) < 0.1;

                                    // Visualize Pauses
                                    const prevKey = correlatedKeys[idx - 1];
                                    const pause = prevKey ? (k.t - prevKey.t) : 0;
                                    const isLongPause = pause > 2000;

                                    return (
                                        <div key={idx}>
                                            {isLongPause && (
                                                <div className="flex items-center gap-2 py-1 opacity-50">
                                                    <div className="w-12 text-right text-yellow-500 font-bold">PAUSE</div>
                                                    <div className="h-px bg-yellow-500/30 flex-1"></div>
                                                    <div className="text-yellow-500">{(pause / 1000).toFixed(1)}s</div>
                                                </div>
                                            )}

                                            <div className={`flex items-center gap-3 py-0.5 hover:bg-white/5 px-2 rounded ${isTriggerMoment ? 'bg-blue-500/20 ring-1 ring-blue-500/50 my-2' : ''}`}>
                                                <div className={`w-12 text-right ${relTime < 0 ? 'text-gray-500' : 'text-green-400'}`}>
                                                    {relTime > 0 ? '+' : ''}{relTime.toFixed(2)}s
                                                </div>

                                                <div className="w-8 flex justify-center">
                                                    {k.type === 'DELETE' ? (
                                                        <span className="text-red-500 font-bold">BS</span>
                                                    ) : k.type === 'INPUT' ? (
                                                        <span className="text-blue-300">IN</span>
                                                    ) : (
                                                        <span className="text-gray-600">NC</span>
                                                    )}
                                                </div>

                                                <div className="flex-1 text-gray-300 truncate">
                                                    {k.type === 'DELETE' ? (
                                                        <span className="text-red-400 line-through decoration-red-500/50 opacity-70">Backspace</span>
                                                    ) : (
                                                        <span>{k.k === ' ' ? '<SPACE>' : k.k === 'Enter' ? '<ENTER>' : k.k}</span>
                                                    )}
                                                </div>

                                                <div className="text-gray-600 w-12 text-right">
                                                    Pos: {k.pos}
                                                </div>
                                            </div>

                                            {isTriggerMoment && (
                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="w-full h-px bg-blue-500/50 flex-1"></div>
                                                    <span className="text-blue-400 font-bold text-xs uppercase px-2 bg-blue-500/10 rounded border border-blue-500/30">
                                                        AI Intervention Triggered
                                                    </span>
                                                    <div className="w-full h-px bg-blue-500/50 flex-1"></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
