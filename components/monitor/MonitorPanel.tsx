'use client';

import useStore from '@/store/useStore';
import { Activity, AlertCircle, Clock } from 'lucide-react';

export default function MonitorPanel() {
    const { cpm, phase, cognitiveState, actionHistory, docLength, pauseDuration, cursorPos, editRatio } = useStore();

    return (
        <div className="w-[300px] bg-gray-900 text-white p-4 flex flex-col gap-6 font-mono text-sm border-r border-gray-800">
            <div>
                <h1 className="text-xl font-bold text-blue-400 mb-1">Monitoring Agent</h1>
                <div className="text-xs text-gray-500">System 1 & 2 Integration</div>
            </div>

            {/* Writing State */}
            <div>
                <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Writing State</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-gray-500 text-[10px] mb-1">PHASE</div>
                        <div className="text-lg font-bold text-white">{phase.toUpperCase()}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] mb-1">STATE</div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${cognitiveState === 'Block' ? 'bg-red-500' : 'bg-green-500'}`} />
                            <span className="text-lg font-bold">{cognitiveState.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
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
                        <div className="text-gray-500 text-[10px]">EDIT RATIO</div>
                        <div className="text-xl font-bold">{(editRatio * 100).toFixed(0)}%</div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-gray-500 text-[10px]">CURSOR POS</div>
                        <div className="text-xl font-bold">{cursorPos}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
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
