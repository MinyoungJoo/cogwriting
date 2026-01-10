import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import ChatLog from '@/src/models/ChatLog';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
        return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    try {
        await dbConnect();
        const chatLogs = await ChatLog.find({ session_id }).sort({ createdAt: 1 });
        return NextResponse.json(chatLogs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch chat logs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        await dbConnect();

        // Validation handled by Mongoose schema
        const chatLog = await ChatLog.create(body);

        return NextResponse.json(chatLog, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to save chat log: ${(error as Error).message}` }, { status: 500 });
    }
}
