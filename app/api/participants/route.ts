import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Participant from '@/src/models/Participant';

// GET: Validate/Get Participant by ID
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    try {
        await dbConnect();
        const participant = await Participant.findById(id);

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        return NextResponse.json(participant);
    } catch (error) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

// POST: Create New Participant
export async function POST(request: Request) {
    try {
        const body = await request.json();
        await dbConnect();

        // Basic validation
        if (!body._id || !body.assigned_group || !body.assigned_genre) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check availability
        const existing = await Participant.findById(body._id);
        if (existing) {
            return NextResponse.json({ error: 'ID already exists' }, { status: 409 });
        }

        const participant = await Participant.create(body);
        return NextResponse.json(participant, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to create participant: ${(error as Error).message}` }, { status: 500 });
    }
}


// PATCH: Update Participant (e.g. mark as completed)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updates } = body;

        if (!_id) {
            return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
        }

        await dbConnect();
        const participant = await Participant.findByIdAndUpdate(_id, updates, { new: true });

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        return NextResponse.json(participant);
    } catch (error) {
        return NextResponse.json({ error: `Failed to update participant: ${(error as Error).message}` }, { status: 500 });
    }
}
