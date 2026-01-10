import mongoose, { Schema } from 'mongoose';

export interface IParticipant {
    _id: string; // Custom ID
    assigned_group: 's1' | 's2' | 'hybrid' | 'monitor';
    assigned_genre: 'creative' | 'argumentative';
    assigned_topic: string;
    is_completed: boolean;
    createdAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
    _id: { type: String, required: true },
    assigned_group: { type: String, enum: ['s1', 's2', 'hybrid', 'monitor'], required: true },
    assigned_genre: { type: String, enum: ['creative', 'argumentative'], required: true },
    assigned_topic: { type: String, required: true },
    is_completed: { type: Boolean, default: false }
}, {
    timestamps: true,
    _id: false // Disable auto-ObjectId since we use custom string ID
});

// Force model recompilation to ensure schema updates are applied in dev
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Participant) {
        delete mongoose.models.Participant;
    }
}

export default mongoose.models.Participant || mongoose.model<IParticipant>('Participant', ParticipantSchema);
