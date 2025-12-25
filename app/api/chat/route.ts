import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const {
            strategy_id,
            system_instruction,
            writing_context,
            chat_history = [],
            user_prompt
        } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not found' }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        let outputFormat = `
{
    "suggestion_content": "The generated text content in Markdown format (e.g., using bullets, bold text). Do NOT use nested JSON objects here."
}
`;

        if (strategy_id === 'S1_REFINEMENT' || strategy_id === 'S1_IDEA_EXPANSION') {
            outputFormat = `
{
  "replacement_text": "A short phrase to fill in the blank. This MUST be a grammatical fragment, NOT a full sentence. Do NOT add a period at the end."
}
`;
        }

        const systemPrompt = `
# {ROLE}
You are an AI Writing Assistant.
Your task is to execute the specific strategy requested by the system.
You must always respond in Korean unless explicitly asked otherwise.

# {INPUTS}
- Strategy ID: ${strategy_id}
- Writing Context: ${writing_context}

# {INSTRUCTION}
${system_instruction}

# {OUTPUT_FORMAT}
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

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            response_format: { type: "json_object" },
        });

        const text = completion.choices[0].message.content;

        if (!text) {
            throw new Error('No content generated');
        }

        const parsed = JSON.parse(text);

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
