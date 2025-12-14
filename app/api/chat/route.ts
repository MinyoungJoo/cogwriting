import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const {
            strategy_id,
            system_instruction,
            writing_context
        } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not found' }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

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

{
    "suggestion_content": "The generated text content.",
    "suggestion_options": ["Option 1", "Option 2", "Option 3"] // ONLY if Strategy is S1_GUIDED_EXPLORATION
}
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Execute strategy." }
            ],
            response_format: { type: "json_object" },
        });

        const text = completion.choices[0].message.content;

        if (!text) {
            throw new Error('No content generated');
        }

        return NextResponse.json(JSON.parse(text));
    } catch (error: any) {
        console.error('Error calling OpenAI API:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}
