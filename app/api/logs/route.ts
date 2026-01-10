import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import KeystrokeLog from '@/src/models/KeystrokeLog';

// GET: Retrieve logs for a session
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
        return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    try {
        await dbConnect();
        const logs = await KeystrokeLog.find({ session_id }).sort({ createdAt: 1 });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

// POST: Batch save logs
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { session_id, events } = body;

        if (!session_id || !Array.isArray(events)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        await dbConnect();

        // Setup for append logic:
        // We can either create a new document for each batch (to avoid 16MB limit, though distinct batches are safer)
        // Or push to existing if size permits.
        // For simplicity and scalability with large logs, creating a NEW document chunk for each batch is safer.
        // The Schema allows this (one Session can have multiple KeystrokeLog chunks).
        // Wait, KeystrokeLog model has `session_id` and `events`.
        // So `await KeystrokeLog.create({ session_id, events })` is valid.

        const logChunk = await KeystrokeLog.create({
            session_id,
            events
        });

        return NextResponse.json({ success: true, count: events.length }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save logs' }, { status: 500 });
    }
}
