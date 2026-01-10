import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Session from '@/src/models/Session';

// GET: List all sessions or get one by ID
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        await dbConnect();

        if (id) {
            const session = await Session.findById(id);
            if (!session) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }
            return NextResponse.json(session);
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const sessions = await Session.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Session.countDocuments();

        return NextResponse.json({
            sessions,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

// POST: Start a new session
export async function POST(request: Request) {
    try {
        const body = await request.json();
        await dbConnect();

        const session = await Session.create(body);
        return NextResponse.json(session, { status: 201 });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 });
    }
}

// PATCH: End session / Update metrics
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ error: 'Missing session _id' }, { status: 400 });
        }

        await dbConnect();

        // [MODIFIED] Allow updating any field passed in updateData, including 'content'
        const session = await Session.findByIdAndUpdate(_id, {
            $set: updateData
        }, { new: true });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}
