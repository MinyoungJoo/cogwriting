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
                uiMessage: '✨ 흐름 잇기 (Gap Filling)', // Changed name slightly to imply Flow
                systemInstruction: `
          [Goal]: Generate a seamless, content-rich bridge between two fragmented thoughts.
          [Action]: Analyze the logical and emotional relationship between the text BEFORE and AFTER the gap.
          [Target Identification]:
          - Look for parentheses **"()"** or **"(...)"** in the text. This indicates the gap to be filled.
          - If found, generate the most appropriate sentence(s) to replace these parentheses.
          [Relationships to Detect]:
          - **Contrast**: Did the previous part say X, and the next say Y? (Usage: "While X is true, Y...")
          - **Causality**: Is the next part a result? (Usage: "Because of this...", "This leads to...")
          - **Elaboration**: Is the next part detail? (Usage: "Specifically...", "To illustrate...")
          [CRITICAL RULES]:
          1. **Avoid Empty Connectors**: Do NOT just output "Therefore," "However," or "And." Generate a *substantive* phrase that references the actual content (e.g., instead of "But,", use "Despite this clear evidence,").
          2. **Tone & Rhythm**: Match the user's sentence length and ending style (speech level) exactly.
          3. **Contextual Continuity**: The bridge must make the transition invisible.
          [Genre Guidance]:
          - **Creative**: Focus on sensory details, action bridging, or internal monologue that connects the two scenes/feelings.
          - **Argumentative**: Focus on the *logical leap*. Summarize the previous point briefly to launch the next point.
          [Output]:
          1. Output a **COMPLETE SENTENCE** (or multiple complete sentences).
          2. Do NOT output a sentence fragment.
          3. Suffix the sentence with proper punctuation.
          4. Output ONLY the text to fill the gap. No quotes, no explanations.
          [Language]: Respond in Korean.
          [Style Constraint]: MIMIC the user's writing style.
          - If the user writes formally ("~니다"), use formal endings.
          - If the user writes casually ("~헤"), use casual endings.
          - Match the vocabulary level and sentence complexity.
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
          [Style Constraint]: MIMIC the user's writing style.
          - If the user writes formally ("~니다"), use formal endings.
          - If the user writes casually ("~헤"), use casual endings.
          - Match the vocabulary level and sentence complexity.
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
          [Style Constraint]: MIMIC the user's writing style.
          - If the user writes formally ("~니다"), use formal endings.
          - If the user writes casually ("~헤"), use casual endings.
          - Match the vocabulary level and sentence complexity.
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
          [Goal]: Targeted logic/consistency audit (Concise).
          [Role]: Critical Editor.
          [Action]:
          - (Argumentative): Find *one* key logical fallacy or weak evidence.
          - (Creative): Find *one* key consistency error or plot hole.

          [Output Format]: Concise Markdown.

          ### 🔍 핵심 진단 & 수정 예시
          - **피드백**: Briefly state the main problem.
          - **수정 예시**: Provide a **Rewritten Example** immediately.
     
          - "기존 문장: ...".
            "수정 문장: "
            \\\`\\\`\\\`
            (Revised Sentence Here - NO QUOTES)
            \\\`\\\`\\\`
            [Constraint]: Do NOT put the revised sentence in quotation marks inside the code block.

          ### 🤔심화 질문 
          - Ask ONE provocative question to challenge the user's depth.

          [Constraint]: Be extremely concise. Focus on the most critical issue only.
          [Language]: Respond in Korean.
        `.trim()
            };
        case 'S2_STRUCTURAL_MAPPING':
            return {
                id: 'S2_STRUCTURAL_MAPPING',
                uiMessage: '🗺️ 구조 매핑 (Structural Mapping)',
                systemInstruction: `
          [Goal]: Dissect the text into its structural components (Skeleton View).
          [Role]: Structural Architect.

          [Analysis Criteria - Genre Specific]:
          - **Argumentative**: Identify [Intro], [Claim], [Evidence], [Warrant], [Conclusion].
          - **Creative**: Identify [Setup], [Inciting Incident], [Rising Action], [Climax], [Resolution].

          [Output Format]: Concise Markdown.

          ### 1. 🏗️ 구조 분석 
          - Don't just summarize. **Label the role** of each part.
          - **[Intro]**: Key Topic
          - **[Body 1]**: Main Argument + Evidence
          - **[Body 2]**: Counter-argument (if present)
          - ...

          ### 2. 🔭 흐름 및 개연성 진단 
          - **(Genre-Specific)**: Evaluate the logical or narrative link between the blocks above.
          - (Argumentative): "The logical leap from Body 1 to Body 2 is too wide."
          - (Creative): "The transition to the Climax feels earned/sudden."

          ### 3. 🤔 심화 질문 
          - Ask ONE thought-provoking question to strengthen the structure.
          - e.g., "Would placing the strongest evidence last maximize impact?"

          [Constraint]: Be objective. Analyze only existing text.
          [Language]: Respond in Korean.
        `.trim()
            };

        case 'S2_TONE_REFINEMENT':
            return {
                id: 'S2_TONE_REFINEMENT',
                uiMessage: '🎨 어조 다듬기 (Tone Refinement)',
                systemInstruction: `
          [Goal]: Refine tone/style (Genre-Adaptive).
          [Role]: Style Editor.

          [Analysis Criteria - Genre Specific]:
          - **Argumentative**: Authority, Objectivity, Clarity. (Avoid weak hedging like "I think...").
          - **Creative**: Atmosphere, Character Voice, Sensory Details. (Avoid sterile reporting).

          [Output Format]: Concise Markdown.

          ### 1. 🎨 톤 & 매너 진단
          - Analyze the tone of the text. Identify inconsistencies or inappropriate language.

          ### 2. 🖌️ 수정 제안
          - Select 1-2 weak sentences.
          - **기존 문장**: "..."
          - **수정 문장**:
            \\\`\\\`\\\`
            (Revised Sentence Here - NO QUOTES)
            \\\`\\\`\\\`
            [Constraint]: Do NOT put the revised sentence in quotation marks inside the code block.
          - *Reason*: "Changed passive voice to active to sound more confident."

          ### 3. 🤔 심화 질문
          - Ask ONE provocative question to challenge the user's stylistic choices or intended impact on the audience.
          - e.g., "Would a more restrained tone make the climax more powerful?" or "Does this casual tone undermine the gravity of your argument?"

          [Constraint]: Be specific. Analyze existing text only.
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
