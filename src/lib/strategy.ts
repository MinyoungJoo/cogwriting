export type Phase = 'Planning' | 'Translating' | 'Reviewing';
export type CognitiveState = 'Flow' | 'Block';

// 사용자가 정의한 전략 ID
export type StrategyID =
    | 'S1_GHOST_TEXT'
    | 'S1_BRAINSTORMING'
    | 'S1_GAP_FILLING'
    | 'S1_REFINEMENT'
    | 'S1_IDEA_EXPANSION'
    | 'S1_PATTERN_BREAKER'
    | 'S2_LOGIC_AUDITOR'
    | 'S2_STRUCTURAL_MAPPING'
    | 'S2_THIRD_PARTY_AUDITOR'
    | 'S2_EVIDENCE_SUPPORT'
    | 'S2_TONE_REFINEMENT';

export interface Strategy {
    id: StrategyID;
    uiMessage: string;
    systemInstruction: string | null;
}

export function selectStrategy(phase: Phase, state: CognitiveState): Strategy | null {
    // Simplified logic: We rely mostly on manual triggers and system time-based triggers now.
    // We can keep some phase-based logic if needed, but for now let's return null to avoid auto-triggering old strategies.
    return null;
}

export function getStrategy(id: StrategyID): Strategy {
    switch (id) {
        case 'S1_GHOST_TEXT':
            return {
                id: 'S1_GHOST_TEXT',
                uiMessage: '🌊 문장 자동 완성 중...',
                systemInstruction: `
        [Goal]: Maintain flow and reduce typing effort.
        [Action]: Complete the user's current sentence naturally. Keep it under 10 words. Output text only.
        [Language]: Respond in Korean.
      `.trim(),
            };
        case 'S1_BRAINSTORMING':
            return {
                id: 'S1_BRAINSTORMING',
                uiMessage: '🚦 아이디어 발산 (Brainstorming)',
                systemInstruction: `
          [Goal]: Stimulate divergent thinking.
          [Action]: The user is stuck. Provide 3 distinct narrative directions (e.g., specific example, counter-argument, elaboration) to unblock the flow.
          [Language]: Respond in Korean.
        `.trim(),
            };
        case 'S1_GAP_FILLING':
            return {
                id: 'S1_GAP_FILLING',
                uiMessage: '✨ 빈칸 채우기 (Gap Filling)',
                systemInstruction: `
          [Goal]: Improve coherence and flow.
          [Action]: The user has left a gap marked by ( ). Suggest a suitable connecting word, phrase, or sentence to bridge the context before and after the gap.
          [Output]: Output ONLY the suggested text.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S1_REFINEMENT':
            return {
                id: 'S1_REFINEMENT',
                uiMessage: '✨ 표현 다듬기 (Refinement)',
                systemInstruction: `
          [Goal]: "Show, Don't Tell". Make the writing more concrete and sensory.
          [Action]: The user provided a word/phrase in ( ). Replace abstract terms with specific, sensory, or evocative descriptions.
          [Example]:
          Input: 슬펐다
          Output: 가슴 한구석이 뻥 뚫린 듯 시려왔다

          Input: 화났다
          Output: 주먹을 꽉 쥐어 손톱이 살을 파고들었다 

          [Output Rules]:
          1. Output ONLY the refined text. Do NOT enclose it in parentheses.
          2. Do NOT repeat the original input word.
          3. Do NOT use "->" or any explanation.
          4. [CRITICAL] Contextual Fit (Fill-in-the-blank):
             - Look at the 'Writing Context' and the [REFINE: word] token.
             - The [REFINE: word] token marks the spot. Use the 'word' inside it as your target to refine.
             - The output MUST be a grammatical FRAGMENT that fits exactly into that spot.
             - Do NOT create a full sentence. Do NOT add a period unless the context requires it.
             - Match the Part of Speech:
               * If [REFINE: adjective], output an Adjective phrase (e.g., "가슴이 미어지는").
               * If [REFINE: verb], output a Verb phrase (e.g., "가슴이 미어지는 듯했다").
             - If the context is "그는 [REFINE: 슬펐다] ", output "가슴이 미어지는 듯했다" (Verb fit).
             - If the context is "그는 [REFINE: 슬픈] 눈으로", output "가슴이 미어지는" (Adjective fit).

          [Context Usage]: Use 'Writing Context' to ensure the refined phrase connects naturally with the surrounding words. Do NOT output the context itself.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S1_IDEA_EXPANSION':
            return {
                id: 'S1_IDEA_EXPANSION',
                uiMessage: '✨ 아이디어 확장 (Expansion)',
                systemInstruction: `
          [Goal]: Expand a seed idea into full content.
          [Action]: The user provided a seed keyword/phrase. Look for the token [EXPAND: keyword] in the 'Writing Context'.
          [Context Usage]: The [EXPAND: keyword] token marks the insertion point. Use the 'keyword' inside it as your seed. Expand this keyword into 2-3 well-written sentences that flow naturally with the surrounding text.
          [Output Rules]:
          1. Output ONLY the expanded text.
          2. Do NOT include the surrounding context.
          3. Do NOT repeat the seed phrase verbatim if possible, but develop it.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S1_PATTERN_BREAKER':
            return {
                id: 'S1_PATTERN_BREAKER',
                uiMessage: '✨ 다른 표현 찾기 (Pattern Breaker)',
                systemInstruction: `
          [Goal]: Break clichés and offer fresh perspectives.
          [Action]: The user wants an alternative to the current suggestion. Provide a suggestion with a different tone, vocabulary, or angle. Avoid common clichés.
          [Output]: Output ONLY the alternative text.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_LOGIC_AUDITOR':
            return {
                id: 'S2_LOGIC_AUDITOR',
                uiMessage: '🔍 논리 점검 (Logic Auditor)',
                systemInstruction: `
          [Goal]: Audit logic and identify bias.
          [Action]: Analyze the provided text for logical fallacies, contradictions, or weak arguments. Identify missing counter-arguments.
          [Output]: Provide a bulleted list of logical issues and suggestions for improvement.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_STRUCTURAL_MAPPING':
            return {
                id: 'S2_STRUCTURAL_MAPPING',
                uiMessage: '🗺️ 구조 매핑 (Structural Mapping)',
                systemInstruction: `
          [Goal]: Visualize the structure of the text.
          [Action]: Analyze the provided text and generate a hierarchical outline (Table of Contents). Identify the Thesis Statement and main supporting points.
          [Output]: Provide a clear, indented outline using Markdown bullets (- or *). Do NOT use JSON for the content.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_THIRD_PARTY_AUDITOR':
            return {
                id: 'S2_THIRD_PARTY_AUDITOR',
                uiMessage: '👀 제3자 검토 (Third-Party Auditor)',
                systemInstruction: `
          [Goal]: Provide objective feedback from a third-party perspective.
          [Action]: Act as a critical reader or editor. Evaluate the text for clarity, engagement, and audience awareness. Point out parts that might be confusing or boring.
          [Output]: Provide constructive feedback as if you were a reviewer. Use Markdown for formatting.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_EVIDENCE_SUPPORT':
            return {
                id: 'S2_EVIDENCE_SUPPORT',
                uiMessage: '📚 근거 보강 (Evidence Support)',
                systemInstruction: `
          [Goal]: Strengthen arguments with evidence.
          [Action]: Identify claims in the text that lack sufficient evidence. Suggest potential facts, data, or types of sources that could support these claims.
          [Output]: List the claims and corresponding suggested evidence using Markdown bullets.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_TONE_REFINEMENT':
            return {
                id: 'S2_TONE_REFINEMENT',
                uiMessage: '🎨 어조 다듬기 (Tone Refinement)',
                systemInstruction: `
          [Goal]: Refine tone and style.
          [Action]: Analyze the tone of the text. Identify inconsistencies or inappropriate language (e.g., too informal, too aggressive). Suggest a more consistent and appropriate tone.
          [Output]: Provide an analysis of the current tone and 2-3 rewritten examples for key sentences.
          [Language]: Respond in Korean.
        `.trim()
            };
        default:
            return {
                id: id,
                uiMessage: 'Processing...',
                systemInstruction: null
            };
    }
}
