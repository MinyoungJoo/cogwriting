import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface IChatLog extends Document {
    session_id: mongoose.Types.ObjectId;
    participant_id: string;
    strategy_id: string; // [NEW] Added for distinguishing chat context (e.g. S2_LOGIC, GENERAL)
    messages: IMessage[];
    createdAt: Date;
    updatedAt: Date;
}

// Force delete model to allow schema update in dev
if (process.env.NODE_ENV === 'development' && mongoose.models.ChatLog) {
    delete mongoose.models.ChatLog;
}

const ChatLogSchema = new Schema<IChatLog>({
    session_id: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    participant_id: { type: String, required: true },
    strategy_id: { type: String, default: 'GENERAL' },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

export default mongoose.models.ChatLog || mongoose.model<IChatLog>('ChatLog', ChatLogSchema);
