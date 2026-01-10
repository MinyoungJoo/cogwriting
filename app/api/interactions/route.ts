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
