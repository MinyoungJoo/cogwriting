import React from 'react';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';

export default function ReviewTools() {
    const { setSelectedStrategy, triggerIntervention, setPendingPayload } = useStore();

    const handleReview = (strategyId: any, label: string) => {
        console.log(`Review Tool Triggered: ${label}`);

        // Create a manual payload
        const payload = monitorAgent.manual_trigger(`Review Request: ${label}`);
        setPendingPayload(payload);

        setSelectedStrategy(strategyId);
        triggerIntervention();
    };

    const tools = [
        { id: 'S2_DIAGNOSIS', label: '🩺 Diagnosis (Quick Check)', desc: '글의 전반적인 상태(논리/구조/어조) 진단', color: 'yellow' },
        { id: 'S2_LOGIC_AUDITOR', label: '🔍 Logic Auditor', desc: '논리 점검 및 반론 제시' },
        { id: 'S2_STRUCTURAL_MAPPING', label: '🗺️ Structural Mapping', desc: '글 구조(목차) 시각화' },

        { id: 'S2_TONE_REFINEMENT', label: '🎨 Tone Refinement', desc: '어조 분석 및 정제' },
    ];

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Review Tools (System 2)
            </h3>
            <div className="grid grid-cols-1 gap-2">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => handleReview(tool.id, tool.label)}
                        className={`flex flex-col items-start p-3 border rounded-lg transition-colors text-left group ${tool.color === 'yellow'
                            ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300'
                            : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-200'
                            }`}
                    >
                        <span className={`font-medium group-hover:text-indigo-700 ${tool.color === 'yellow' ? 'text-yellow-800' : 'text-gray-800'}`}>
                            {tool.label}
                        </span>
                        <span className={`text-xs mt-1 ${tool.color === 'yellow' ? 'text-yellow-700/80' : 'text-gray-500'}`}>
                            {tool.desc}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
