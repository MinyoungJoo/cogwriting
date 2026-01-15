import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const {
            strategy_id,
            system_instruction,
            writing_context,
            chat_history = [],
            user_prompt,
            context_data
        } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not found' }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // --- Step 1: Determine Output Format ---
        let outputFormatObj: any = {
            "suggestion_content": "The generated text content in Markdown format (e.g., using bullets, bold text). Do NOT use nested JSON objects here."
        };

        if (strategy_id === 'S1_PARAPHRASING' || strategy_id === 'S1_GAP_FILLING' || strategy_id === 'S1_IDEA_EXPANSION' || strategy_id === 'S1_DRAFTING' || strategy_id === 'S1_PATTERN_BREAKER') {
            outputFormatObj = {
                "replacement_text": "A short phrase to fill in the blank. This MUST be a grammatical fragment, NOT a full sentence. Do NOT add a period at the end."
            };
        } else if (strategy_id === 'S1_IDEA_SPARK') {
            outputFormatObj = {
                "suggestion_options": [
                    "[Strategy] Question 1",
                    "[Strategy] Question 2",
                    "[Strategy] Question 3"
                ]
            };
        } else if (strategy_id === 'S2_DIAGNOSIS') {
            outputFormatObj = {
                "logic": "Brief feedback on logic (Korean)...",
                "structure": "Brief feedback on structure (Korean)...",
                "tone": "Brief feedback on tone (Korean)..."
            };
        }

        const outputFormat = JSON.stringify(outputFormatObj, null, 2);

        // Construct Writing Context (Handle Custom Context Data)
        let finalWritingContext = writing_context;
        // [MODIFIED] No longer separating Full Context and Focal Segment.
        // The writing_context now contains the [CURSOR] marker for S2_DIAGNOSIS.

        let finalSystemInstruction = system_instruction;
        // Add specific instruction for Diagnosis to find the cursor
        if (strategy_id === 'S2_DIAGNOSIS') {
            finalSystemInstruction += "\n\n[IMPORTANT] The user's cursor position is marked by '[CURSOR]'. Analyze the text immediately surrounding this marker to determine the context of the struggle.";
        }

        // Determine Genre Context
        const writingGenre = context_data?.writingGenre || 'General';
        const writingTopic = context_data?.writingTopic || 'Not set';
        const writingPrompt = context_data?.writingPrompt || writingTopic; // [MODIFIED] Use Prompt Text if available, fallback to Topic (ID/Text)
        const writingAudience = context_data?.writingAudience || 'General';
        const userGoal = context_data?.userGoal || 'Not set';

        const systemPrompt = `
# { ROLE }
You are an AI Writing Assistant.
Your task is to execute the specific strategy requested by the system.
You must always respond in Korean unless explicitly asked otherwise.

# { STRATEGY_INSTRUCTION } (PRIMARY DIRECTIVE)
${finalSystemInstruction}

# { Meta Layer }
- Writing Context: ${writingGenre}
- Assigned Topic: ${writingPrompt}
- Audience: ${writingAudience}
- User's Specific Goal: >>> ${userGoal} <<<

# { CONTEXT_GUIDELINES }
너는 위 '# { Meta layer}' 에 포함된 context, topic, audience 바탕으로 글쓰기를 돕는 파트너이다. 
항상 아래 '# { INPUTS }' 섹션에 제공된 사용자의 현재 쓴 글'Writing Context'을 바탕으로 답변해라.
응답을 생성할떄, User's Specific Goal에 맞추어서 응답을 생성해라.

# { INPUTS }
- Strategy ID: ${strategy_id}
- Writing Context: ${finalWritingContext}

# { OUTPUT_FORMAT }
Respond strictly in JSON format.

${outputFormat}
`;

        console.log('--- SYSTEM PROMPT ---');
        console.log(systemPrompt);
        console.log('---------------------');

        // Construct messages array
        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...chat_history.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            })),
            { role: "user", content: user_prompt || "Execute strategy." }
        ];

        // --- Step 2: LLM Call ---
        let model = "gpt-4o-mini";
        let finalSystemPrompt = systemPrompt;

        if (strategy_id === 'S2_EVIDENCE_SUPPORT') {
            model = "gpt-4o-search-preview";
            finalSystemPrompt = `너는 학술적 글쓰기를 돕는 에이전트야. 사용자의 주장에 대해 신뢰할 수 있는 실시간 데이터와 출처를 제공해줘.
반드시 다음 JSON 형식으로 응답해:
{
  "suggestion_content": "Markdown 형식의 근거 및 출처 내용"
}`;

            // Override messages for this specific model/strategy
            const evidenceMessages: any[] = [
                { role: "system", content: finalSystemPrompt },
                ...chat_history.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: "user", content: `Context: ${writing_context}\n\nUser Request: ${user_prompt || system_instruction}` }
            ];

            const completion = await openai.chat.completions.create({
                model: model,
                messages: evidenceMessages,
                // @ts-ignore - web_search_options is a preview feature
                web_search_options: {
                    user_location: {
                        type: "approximate",
                        approximate: {
                            country: "KR",
                            city: "Seoul",
                            region: "Seoul",
                        },
                    },
                },
            });

            let text = completion.choices[0].message.content;
            if (!text) throw new Error('No content generated');

            // Clean up markdown code blocks if present
            text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                console.warn("Failed to parse JSON from Evidence Support, falling back to raw text.");
                parsed = { suggestion_content: text };
            }

            // Ensure suggestion_content is a string
            if (typeof parsed.suggestion_content === 'object') {
                parsed.suggestion_content = JSON.stringify(parsed.suggestion_content, null, 2);
            }

            return NextResponse.json({
                ...parsed,
                system_prompt: finalSystemPrompt
            });
        }

        // Standard Logic for other strategies
        const completion = await openai.chat.completions.create({
            model: model,
            messages: messages,
            response_format: { type: "json_object" },
        });

        const text = completion.choices[0].message.content;
        if (!text) throw new Error('No content generated');
        const parsed = JSON.parse(text);

        // Standard Response
        // Ensure suggestion_content is a string
        if (typeof parsed.suggestion_content === 'object') {
            parsed.suggestion_content = JSON.stringify(parsed.suggestion_content, null, 2);
        }

        return NextResponse.json({
            ...parsed,
            system_prompt: systemPrompt
        });

    } catch (error: any) {
        console.error('Error calling OpenAI API:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}
