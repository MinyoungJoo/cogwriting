import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Interaction from '@/src/models/Interaction';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
        return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    try {
        await dbConnect();
        const interactions = await Interaction.find({ session_id }).sort({ timestamp: 1 });
        return NextResponse.json(interactions);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        await dbConnect();

        // Validation handled by Mongoose schema
        const interaction = await Interaction.create(body);

        return NextResponse.json(interaction, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: `Failed to save interaction: ${(error as Error).message}` }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { interaction_id, ...updateData } = body;

        if (!interaction_id) {
            return NextResponse.json({ error: 'Missing interaction_id' }, { status: 400 });
        }

        await dbConnect();
        const interaction = await Interaction.findByIdAndUpdate(
            interaction_id,
            { $set: updateData },
            { new: true }
        );

        if (!interaction) {
            return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
        }

        return NextResponse.json(interaction);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 });
    }
}
