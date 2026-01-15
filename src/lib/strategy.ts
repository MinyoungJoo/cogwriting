export type Phase = 'Planning' | 'Translating' | 'Reviewing';
export type CognitiveState = 'Flow' | 'Block';

// 사용자가 정의한 전략 ID
export type StrategyID =
    | 'S1_IDEA_SPARK'
    | 'S1_GAP_FILLING'
    | 'S1_PARAPHRASING'
    | 'S1_IDEA_EXPANSION'
    | 'S1_PATTERN_BREAKER'
    | 'S1_DRAFTING'
    | 'S2_CUSTOM_REQUEST'
    | 'S2_LOGIC_AUDITOR'
    | 'S2_STRUCTURAL_MAPPING'
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
        case 'S2_DIAGNOSIS':
            return {
                id: 'S2_DIAGNOSIS',
                name: 'On-demand Diagnosis',
                trigger: 'Manual (Struggle Detection)',
                description: 'Diagnose writing issues (Logic, Structure, Tone)',
                uiMessage: '🩺 진단 중...',
                systemInstruction: `
            [Goal]: Diagnose the user's writing struggle and recommend the best tool.
            [Context]: The user is rewriting this section repeatedly.
            [Role]: A helpful, empathetic writing assistant.
            [Action]:
            Analyze the text based on the Writing Genre (Argumentative vs Creative).
            Provide a very brief (1 sentence) diagnosis for EACH aspect.

            [Genre-Specific Criteria]:
            1. **Argumentative**:
               - Logic: Strength of claims, evidence support, logical fallacies.
               - Structure: Intro-Body-Conclusion, logical transitions.
               - Tone: Objectivity, authority, persuasion.
            2. **Creative**:
               - Logic: Narrative consistency, character motivation, plot holes.
               - Structure: Scene pacing, dramatic tension, show-dont-tell.
               - Tone: Atmosphere, sensory details, character voice.

            [Output Format]:
            1. Logic: [Brief Diagnosis based on Genre]
            2. Structure: [Brief Diagnosis based on Genre]
            3. Tone: [Brief Diagnosis based on Genre]

            [Condition: Short or Empty Text]
            If text < 10 words:
            - Provide GENERIC, ENCOURAGING advice.
            - Logic: "주제나 소재를 먼저 정해보세요."
            - Structure: "어떤 흐름으로 쓸지 상상해보세요."
            - Tone: "독자에게 어떤 느낌을 주고 싶은지 정해보세요."
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
          [Goal]: seamless gap filling.
          [Action]: The user has left a gap. Analyze the text BEFORE and AFTER the gap to generate a connecting phrase/sentence.
          [CRITICAL RULES]:
          1. **Tone Matching**: STRICTLY analyze and match the ending styles (speech level) of the surrounding sentences (e.g., ~다, ~요, ~습니다). Do NOT mix styles.
          2. **Logical Flow**: The suggestion must logically bridge the previous thought to the following thought. It must not contradict the user's argument or introduce a sudden topic shift.
          [Genre Guidance]:
          - Creative: Focus on emotional continuity or action sequence.
          - Argumentative: Focus on logical connectors (However, Therefore) or strengthening the link between claim and evidence.
          [Output]: Output ONLY the text to fill the gap. No explanations.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S1_PARAPHRASING':
            return {
                id: 'S1_PARAPHRASING',
                uiMessage: '🔄 문장 바꾸기 (Paraphrasing)',
                systemInstruction: `
          [Goal]: Paraphrase the selected text to improve clarity, flow, or impact.
          [Action]: The user has selected a sentence or phrase. Rewrite it using different vocabulary and structure while preserving the original meaning.
          [Genre-Specific Guidance]:
          - IF Creative: Make it more vivid, emotional, or immersive.
          - IF Argumentative: Make it more concise, persuasive, or authoritative.
          [Output rules]:
          1. Output ONLY the paraphrased text.
          2. Do NOT add extra explanations.
          3. Ensure the rewritten version fits grammatically into the surrounding context if it's a partial selection.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S1_IDEA_EXPANSION':
            return {
                id: 'S1_IDEA_EXPANSION',
                uiMessage: '✨ 아이디어 확장 (Expansion)',
                systemInstruction: `
          [Goal]: Expand a seed idea into full content.
          [Genre-Specific Guidance]:
          - IF Creative: Elaborate on the atmosphere, the character's internal state, or the vividness of the scene. Make it immersive.
          - IF Argumentative: Elaborate on the reasoning, provide a hypothetical example, or explain the significance of the keyword in the context of the argument.
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
                uiMessage: '🔍 논리 & 제3자 검토 (Logic & Audit)',
                systemInstruction: `
          [Goal]: Audit logic and provide objective third-party feedback.
          [Role]: You are a critical reviewer and editor.
          [Action]:
          1. Analyze the text for logical fallacies, contradictions, or weak arguments.
          2. Evaluate clarity, flow, and audience awareness. Point out parts that are confusing, boring, or lack connection.
          3. Identify missing counter-arguments or potential biases.
          [Output]: Provide a structured review using Markdown bullets:
          - **논리적 오류 & 개선 (Logical Fallacies & Fix)**: Identify the error and provide a corrected argument example.
          - **명확성 및 가독성 (Clarity & Flow)**: Point out confusing parts and **provide a rewritten sentence** for better clarity. (e.g., "Change A to B")
          - **개선 제안 (Suggestions)**: Actionable advice.
          [Constraint]: When pointing out a problem, ALWAYS provide a specific **"Rewritten Example" (수정 예시)** so the user knows exactly how to fix it.
        `.trim()
            };
        case 'S2_STRUCTURAL_MAPPING':
            return {
                id: 'S2_STRUCTURAL_MAPPING',
                uiMessage: '🗺️ 구조 매핑 (Structural Mapping)',
                systemInstruction: `
          [Goal]: Visualize the structure of the *currently written* text.
          [CRITICAL CONSTRAINT]: Analyze ONLY the provided text. Do NOT invent, predict, or add sections that the user has not written yet.
          [Action]:
          1. Identify the actual structure (Paragraphs, Sections) present in the text.
          2. Extract the main point or topic of each existing paragraph.
          3. If the text is incomplete (e.g., only an intro), map ONLY that part.
          
          [Genre-Specific Analysis]:
          - IF Argumentative: Focus on logical flow (Introduction -> Argument -> Evidence).
          - IF Creative: Focus on **Narrative Flow & Consistency**.
            * Check if scene transitions are smooth.
            * Check for **Logical Gaps** in the plot (e.g., teleporting characters, unexplained events).
            * Check for **Character Consistency** (actions matching personality).

          [Output]:
          - Use a hierarchical list (Markdown bullets).
          - (Creative) **서사 흐름 (Narrative Flow)**: [Scene 1] -> [Scene 2] ...
          - (Creative) **개연성 점검 (Consistency Check)**: Point out any gaps if found.
          - (Optional) **제안 (Suggestion)**: ...
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
