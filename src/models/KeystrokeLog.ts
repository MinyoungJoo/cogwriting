import mongoose, { Schema, Document } from 'mongoose';

export interface IKeystrokeLog extends Document {
    session_id: mongoose.Types.ObjectId;
    events: Array<{
        t: number;
        k: string;
        type: 'INPUT' | 'DELETE' | 'NC';
        pos: number;
    }>;
}

const KeystrokeLogSchema = new Schema<IKeystrokeLog>({
    session_id: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    events: [{
        t: { type: Number, required: true },
        k: { type: String, required: true },
        type: { type: String, enum: ['INPUT', 'DELETE', 'NC'], required: true },
        pos: { type: Number, required: true },
        _id: false // Disable _id for subdocuments to save space
    }]
}, {
    timestamps: true
});

export default mongoose.models.KeystrokeLog || mongoose.model<IKeystrokeLog>('KeystrokeLog', KeystrokeLogSchema);
