export type Phase = 'Planning' | 'Translating' | 'Reviewing';
export type CognitiveState = 'Flow' | 'Block';

// 사용자가 정의한 전략 ID
export type StrategyID =
    | 'S1_GHOST_TEXT'
    | 'S1_IDEA_SPARK'
    | 'S1_GAP_FILLING'
    | 'S1_REFINEMENT'
    | 'S1_IDEA_EXPANSION'
    | 'S1_PATTERN_BREAKER'
    | 'S1_DRAFTING'
    | 'S2_CUSTOM_REQUEST'
    | 'S2_LOGIC_AUDITOR'
    | 'S2_STRUCTURAL_MAPPING'
    | 'S2_THIRD_PARTY_AUDITOR'
    | 'S2_EVIDENCE_SUPPORT'
    | 'S2_TONE_REFINEMENT'
    | 'S2_DIAGNOSIS';

export interface Strategy {
    id: StrategyID;
    name?: string;
    trigger?: string;
    description?: string;
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
        case 'S2_DIAGNOSIS':
            return {
                id: 'S2_DIAGNOSIS',
                name: 'On-demand Diagnosis',
                trigger: 'Manual (Struggle Detection)',
                description: 'Diagnose writing issues (Logic, Structure, Tone)',
                uiMessage: '🩺 진단 중...',
                systemInstruction: `
            [Goal]: Diagnose the user's writing struggle and recommend the best tool.
            [Context]: The writer has hit a "Struggle Point" (high revision rate & pauses).
            - Full Context: [FULL_TEXT] (Provided in Writing Context)
            - Focal Segment (where struggle occurs): >>> [FOCAL_SEGMENT] <<< (Provided in Writing Context)

            [Task]:
            Analyze the [FOCAL_SEGMENT] in relation to the [FULL_TEXT].
            Provide a specific, one-sentence diagnostic hypothesis for each of the following three categories.
            Focus on the "Why": why is the writer stuck?

            [Diagnostic Guidelines]:
            1. Logic: Is there a gap in reasoning or a contradiction with previous statements?
               (e.g., "전제와 결론 사이의 논리적 비약 때문에 연결 문장을 고민하시는 것 같군요.")
            2. Structure: Is this segment deviating from the overall flow or outline?
               (e.g., "현재 내용이 서론의 주제와 멀어지고 있어 흐름을 잡기 어려워 보입니다.")
            3. Tone: Is there a struggle with word choice or maintaining a consistent voice?
               (e.g., "학술적 문체와 구어체 사이에서 적절한 단어를 선택하는 데 어려움이 느껴집니다.")

            [Output Format]:
            You MUST return a valid JSON object. Do NOT wrap it in markdown code blocks.
            Structure:
            {
              "logic": "Brief feedback on logic (Korean)...",
              "structure": "Brief feedback on structure (Korean)...",
              "tone": "Brief feedback on tone (Korean)..."
            }
            `.trim(),
            };
        case 'S1_IDEA_SPARK':
            return {
                id: 'S1_IDEA_SPARK',
                uiMessage: '💡 아이디어 스파크 (Idea Spark)',
                systemInstruction: `
          [Goal]: Stimulate divergent thinking using SCAMPER to help the writer overcome blocks.
          [Action]: Analyze the context and select the 3 most suitable SCAMPER strategies. Generate a specific question for each.
          [Condition 1: Context Exists]
          If the Writing Context provides specific content or a topic:
          - Analyze the existing text and select the 3 most suitable SCAMPER strategies.
          - Generate specific, context-aware questions that challenge the writer's current perspective.

          [Condition 2: Empty Context]
          If the Writing Context is empty, null, or only contains a very short/vague title:
          - Focus on "Starting from Scratch."
          - Generate 3 provocative SCAMPER-based questions to help the user find an initial topic or a unique hook.
          - Examples for Empty Context:
            - [Substitute] "기존의 뻔한 주제 대신, 전혀 연관 없어 보이는 두 단어를 합쳐서 글을 시작해볼까요?"
            - [Reverse] "글의 결론이나 마지막 장면부터 먼저 써보고 거꾸로 올라오는 방식은 어떨까요?"
            - [Combine] "오늘 가장 강렬했던 감정과 최근 읽은 뉴스 한 조각을 엮어 글의 소재로 삼아볼까요?"
          
          [Strategies]:
          - Substitute: Replace characters, setting, materials. (e.g., "만약 이 상황의 주인공이 '어린아이'라면?")
          - Combine: Combine disparate concepts. (e.g., "이 논리에 '환경 문제'라는 키워드를 결합해 본다면?")
          - Adapt: Borrow principles from other fields. (e.g., "이 현상을 '경제학의 수요-공급 원리'로 설명해 볼까요?")
          - Modify: Emphasize or modify features. (e.g., "이 상황에서 가장 사소한 '소리' 하나만 아주 크게 강조해본다면?")
          - Put to other use: Change purpose. (e.g., "이 주장을 '설득'이 아니라 '비웃는 용도'로 쓴다면?")
          - Eliminate: Remove key elements. (e.g., "만약 '가장 중요한 전제'를 삭제한다면?")
          - Reverse: Reverse order or causality. (e.g., "결과를 먼저 보여주고 원인을 나중에 설명한다면?")
          [Output]:
          Provide the 3 questions in the specified JSON format (suggestion_options array).
          Prefix each question with the strategy used in brackets, e.g., "[Substitute] Question...".
          Maintain a supportive, curious, and provocative tone.
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
          [Output]: Output ONLY the alternative text. Keep it under 10 words. It must be a grammatical fragment that fits the context.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S1_DRAFTING':
            return {
                id: 'S1_DRAFTING',
                uiMessage: '📝 문장 시작 (Sentence Starter)',
                systemInstruction: `
          [Goal]: Help the user start writing by providing the first few words of a sentence that answers the selected SCAMPER question.
          [Action]: The user selected a SCAMPER question. Generate the *opening phrase* or *first half of a sentence* that naturally begins an answer to this question in the current context.
          [Input]: Use the 'User Prompt' as the selected question.
          [Output]: Output ONLY the sentence starter. Do NOT write a full sentence. Do NOT add a period.
          [Example]:
          - Question: "What if the protagonist was a child?"
          - Output: "If I were a child looking at this,"
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_CUSTOM_REQUEST':
            return {
                id: 'S2_CUSTOM_REQUEST',
                uiMessage: '✨ 사용자 요청 (Custom Request)',
                systemInstruction: `
          [Goal]: Execute the user's specific request on the selected text.
          [Action]: The user has provided a specific instruction (User Prompt) and a selected text (Writing Context). Apply the instruction to the selected text.
          [Output]: Output ONLY the modified text. Do NOT include explanations.
          [Language]: Respond in Korean unless the user asks for another language.
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
          [Action]: Identify claims in the text that lack sufficient evidence. Provide reliable real-time data and sources to support these claims.
          [Output]: List the claims and corresponding suggested evidence with citations using Markdown bullets.
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
