'use client';

import useStore from '@/store/useStore';
import { api } from '@/src/lib/api';
import { Activity, AlertCircle, Clock, Settings } from 'lucide-react';

export default function MonitorPanel() {
    const {
        cpm, phase, cognitiveState, actionHistory, docLength, pauseDuration, cursorPos, editRatio, revisionRatio,
        feedbackItems, focusedFeedbackId, setFocusedFeedbackId, setSelectedStrategy,
        isSystemInitiatedEnabled, toggleSystemInitiated,
        setIsGoalSet // Import setIsGoalSet
    } = useStore();

    // Import monitorAgent to reset
    const { monitorAgent } = require('@/src/lib/MonitorAgent');

    return (
        <div className="w-[300px] bg-gray-900 text-white p-4 flex flex-col gap-6 font-mono text-sm border-r border-gray-800">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold text-blue-400 mb-1">Monitoring Agent</h1>
                    <div className="text-xs text-gray-500">System 1 & 2 Integration</div>
                </div>
                <button
                    onClick={() => {
                        setIsGoalSet(false);
                        monitorAgent.resetSession();
                    }}
                    className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-white"
                    title="Configure Goal"
                >
                    <Settings size={16} />
                </button>

            </div>



            <div>
                <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Metrics</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-gray-500 text-[10px]">CPM</div>
                        <div className="text-xl font-bold">{Math.round(cpm)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px]">DOC LENGTH</div>
                        <div className="text-xl font-bold">{docLength}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px]">PAUSE (s)</div>
                        <div className={`text-xl font-bold ${pauseDuration > 2 ? 'text-yellow-400' : 'text-white'}`}>
                            {pauseDuration}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px]">REVISION RATIO</div>
                        <div className={`text-xl font-bold ${revisionRatio < 0.6 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {(revisionRatio * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-gray-500 text-[10px]">CURSOR POS</div>
                        <div className="text-xl font-bold">{cursorPos}</div>
                    </div>
                </div>
            </div>


            {/* System Feedback */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[150px]">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-gray-400 text-xs uppercase tracking-wider">TRIGGER LOG</h2>
                    <button
                        onClick={toggleSystemInitiated}
                        className={`text-[10px] px-2 py-1 rounded border ${isSystemInitiatedEnabled
                            ? 'bg-green-900/30 border-green-500 text-green-400'
                            : 'bg-red-900/30 border-red-500 text-red-400'
                            }`}
                    >
                        {isSystemInitiatedEnabled ? 'AUTO: ON' : 'AUTO: OFF'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-800 rounded p-2 space-y-2">
                    {/* Struggle Detection Alert - Moved to Editor Margin Nudge */}
                    {feedbackItems.slice().reverse().map(item => (
                        <div
                            key={item.id}
                            onClick={() => {
                                setFocusedFeedbackId(item.id);
                                // Removed auto-selection of strategy on click
                                // if (item.strategyId) {
                                //     setSelectedStrategy(item.strategyId as any);
                                // }
                            }}
                            className={`p-2 rounded cursor-pointer transition-colors border ${focusedFeedbackId === item.id
                                ? 'bg-blue-900/30 border-blue-500'
                                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle size={12} className="text-yellow-500" />
                                <span className="text-xs font-bold text-gray-200">{item.trigger}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 line-clamp-2">
                                {item.context}
                            </div>
                            <div className="flex justify-between mt-1 text-[9px] text-gray-500">
                                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                <span>{item.resolved ? 'Resolved' : 'Active'}</span>
                            </div>
                        </div>
                    ))}
                    {feedbackItems.length === 0 && (
                        <div className="text-gray-600 text-xs italic">No active feedback</div>
                    )}
                </div>
            </div>

            {/* Keystroke Log */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[150px] border-t border-gray-800 pt-4">
                <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Keystroke Log</h2>
                <div className="flex-1 overflow-y-auto bg-gray-800 rounded p-2 text-[10px] font-mono space-y-1">
                    {actionHistory.slice().reverse().map((action, idx) => (
                        <div key={idx} className="flex justify-between text-gray-300">
                            <span>{action.event_code}</span>
                            <span className="text-gray-500">{new Date(action.time * 1000).toLocaleTimeString().split(' ')[0]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
