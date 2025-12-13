export type Phase = 'Planning' | 'Translating' | 'Reviewing';
export type CognitiveState = 'Flow' | 'Block';

// 사용자가 정의한 4가지 전략 ID
export type StrategyID =
    | 'S1_ACTIVE_COWRITING'
    | 'S1_GUIDED_EXPLORATION'
    | 'S2_STRUCTURED_GUIDANCE'
    | 'S2_CRITICAL_FEEDBACK';

export interface Strategy {
    id: StrategyID;
    uiMessage: string;
    systemInstruction: string | null;
}

export function selectStrategy(phase: Phase, state: CognitiveState): Strategy | null {

    // 1. Planning Phase
    if (phase === 'Planning') {
        if (state === 'Block') {
            return {
                id: 'S2_STRUCTURED_GUIDANCE', // Goal: Organize thoughts
                uiMessage: '🚦 뼈대를 잡아드릴까요?',
                systemInstruction: `
          [Goal]: Organize thoughts and set goals.
          [Action]: The user is struggling to start. Suggest a logical 3-point outline based on the keywords provided.
          [Language]: Respond in Korean.
        `.trim(),
            };
        }
        return null;
    }

    // 2. Translating Phase
    if (phase === 'Translating') {
        if (state === 'Block') {
            return {
                id: 'S1_GUIDED_EXPLORATION', // Goal: Stimulate divergent thinking
                uiMessage: '🚦 다음 내용 추천 (3가지 방향)',
                systemInstruction: `
          [Goal]: Stimulate divergent thinking.
          [Action]: The user is stuck. Provide 3 distinct narrative directions (e.g., specific example, counter-argument, elaboration) to unblock the flow.
          [Language]: Respond in Korean.
        `.trim(),
            };
        }
        // Translating + Flow
        return {
            id: 'S1_ACTIVE_COWRITING', // Goal: Maintain flow
            uiMessage: '🌊 문장 자동 완성 중...',
            systemInstruction: `
        [Goal]: Maintain flow and reduce typing effort.
        [Action]: Complete the user's current sentence naturally. Keep it under 10 words. Output text only.
        [Language]: Respond in Korean.
      `.trim(),
        };
    }

    // 3. Reviewing Phase
    if (phase === 'Reviewing') {
        if (state === 'Block') {
            return {
                id: 'S2_CRITICAL_FEEDBACK', // Goal: Evaluate and correct
                uiMessage: '🚦 논리/어조 분석 중...',
                systemInstruction: `
          [Goal]: Evaluate and correct.
          [Action]: Analyze the focused paragraph. Point out logical fallacies, missing evidence, or tone inconsistencies.
          [Language]: Respond in Korean.
        `.trim(),
            };
        }
        // Reviewing + Flow (Simple fixes)
        return {
            id: 'S1_ACTIVE_COWRITING', // Goal: Reduce typing effort (Editing)
            uiMessage: '🌊 문법/표현 교정 중...',
            systemInstruction: `
        [Goal]: Maintain flow and reduce typing effort.
        [Action]: Act as a proofreader. Rewrite the current sentence to fix grammar or improve clarity. Output only the corrected text.
        [Language]: Respond in Korean.
      `.trim(),
        };
    }

    return null;
}
