import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import ChatLog from '@/src/models/ChatLog';

export async function POST(req: Request) {
    try {
        const {
            strategy_id,
            system_instruction,
            writing_context,
            chat_history: client_history = [],
            user_prompt,
            context_data
        } = await req.json();

        // [NEW] Server-Side Context Hydration (Segregated by Strategy)
        let chat_history = client_history;
        const sessionId = context_data?.sessionId;

        if (sessionId && !strategy_id.startsWith('S1_')) {
            try {
                await dbConnect();
                // [CRITICAL] Filter by strategy_id to maintain tool separation
                const dbLogs = await ChatLog.find({
                    session_id: sessionId,
                    strategy_id: strategy_id
                }).sort({ createdAt: 1 }).lean();

                if (dbLogs.length > 0) {
                    // Flatten messages from all logs
                    chat_history = dbLogs.flatMap(log => log.messages.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content
                    })));
                }
            } catch (error) {
                console.error('[ChatAPI] Failed to hydrate history:', error);
                // Fallback to client history
            }
        }

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

        let systemPrompt = `
# { ROLE }
You are an AI Writing Assistant.
Your task is to execute the specific strategy requested by the system.
You must always respond in Korean unless explicitly asked otherwise.

# { STRATEGY_INSTRUCTION } (PRIMARY DIRECTIVE)
${finalSystemInstruction}

# { REFERENCE_CONTEXT }
- Writing Context: ${writingGenre}
- Assigned Topic: ${writingPrompt}
- Audience: ${writingAudience}
- User's Specific Goal: >>> ${userGoal} <<<

# { CONTEXT_GUIDELINES }
- **CRITICAL**: Your analysis must be performed ONLY on the text content provided in '# { TARGET_TEXT_FOR_ANALYSIS }'.
- The '# { REFERENCE_CONTEXT }' section is ONLY for background information (Topic/Audience).
- Do NOT critique the text for *missing* parts of the topic/prompt unless the text is clearly finished.
- Analyze ONLY the words currently present in '# { TARGET_TEXT_FOR_ANALYSIS }'.

# { TARGET_TEXT_FOR_ANALYSIS }
- Strategy ID: ${strategy_id}`;

        if (context_data?.focalSegment && context_data?.focalSegment !== context_data?.fullText) {
            systemPrompt += `\n\n[CONTEXT INFORMATION]\n`;
            systemPrompt += `The user is asking about a specific segment of the text, but the whole document is provided for context.\n`;
            systemPrompt += `\n<FULL_DOCUMENT>\n${context_data.fullText || finalWritingContext}\n</FULL_DOCUMENT>\n`;
            systemPrompt += `\n<TARGET_SEGMENT_TO_REFINE>\n${context_data.focalSegment}\n</TARGET_SEGMENT_TO_REFINE>\n`;
            systemPrompt += `\nEnsure your response focuses on the <TARGET_SEGMENT_TO_REFINE> while considering its fit within the <FULL_DOCUMENT>.`;
        } else {
            systemPrompt += `\n- Writing Context: ${finalWritingContext}`;
        }

        systemPrompt += `

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
