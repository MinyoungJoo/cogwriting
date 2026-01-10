import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    participant_id: string;
    meta: {
        topic_id?: string;
        user_goal?: string;
    };
    final_text?: string;
    content?: string; // [NEW]
    time_metrics?: {
        start_at: Date;
        end_at?: Date;
        total_duration?: number;
        total_ai_latency?: number;
        net_writing_time?: number;
    };
}

const SessionSchema = new Schema<ISession>({
    participant_id: { type: String, ref: 'Participant', required: true },
    meta: {
        topic_id: String,
        user_goal: String,
        writing_genre: String, // [NEW]
        writing_group: String  // [NEW]
    },
    final_text: String,
    time_metrics: {
        start_at: { type: Date, required: true },
        end_at: Date,
        total_duration: Number,
        total_ai_latency: Number,
        net_writing_time: Number
    }
}, {
    timestamps: true
});

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
