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
        { id: 'S2_LOGIC_AUDITOR', label: '🔍 Logic Auditor', desc: '논리 점검 및 반론 제시' },
        { id: 'S2_STRUCTURAL_MAPPING', label: '🗺️ Structural Mapping', desc: '글 구조(목차) 시각화' },
        { id: 'S2_THIRD_PARTY_AUDITOR', label: '👀 Third-Party Auditor', desc: '제3자(비평가) 피드백' },
        { id: 'S2_EVIDENCE_SUPPORT', label: '📚 Evidence Support', desc: '근거 자료 추천' },
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
                        className="flex flex-col items-start p-3 bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left group"
                    >
                        <span className="font-medium text-gray-800 group-hover:text-indigo-700">
                            {tool.label}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                            {tool.desc}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
