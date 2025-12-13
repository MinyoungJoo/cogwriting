import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const {
            strategy_id,
            system_instruction,
            writing_context
        } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not found' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: { responseMimeType: "application/json" }
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

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json(JSON.parse(text));
    } catch (error: any) {
        console.error('Error calling Gemini API:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}
