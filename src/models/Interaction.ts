import mongoose, { Schema, Document } from 'mongoose';

export interface IInteraction extends Document {
    session_id: mongoose.Types.ObjectId;
    participant_id: string;

    // Cognitive Type (Most important ⭐)
    cognitive_type: 'S1' | 'S2';

    // Initiative Source
    initiative: 'System' | 'User'; // SI: System-Initiated (Nudge), UI: User-Initiated (Button/Markup)

    // Specific Feature Name
    feature_type: 'IDEA_SPARK' | 'STRUGGLE_NUDGE' | 'GHOST_TEXT' | 'LOGIC' | 'STRUCTURE' | 'TONE' | 'GAP_FILLING' | 'REFINEMENT' | 'EXPANSION';

    writing_context?: string; // [NEW] Full text at trigger moment

    // Writer State Context at Trigger moment
    trigger_metrics: {
        revision_ratio: number; // Editing efficiency
        pause_duration: number; // Pause duration in ms
        cpm: number;            // Current typing speed
    };

    focal_segment: string;     // Text segment analyzed/targeted by AI
    ai_response: any;          // AI output content (e.g., SCAMPER questions or Diagnosis report)

    // User's Final Reaction
    user_action: 'ACCEPT' | 'REJECT' | 'IGNORE';
    selected_option?: string;  // Specific choice if multiple options were given

    latency: number;           // Time to react (ms)
    timestamp: Date;
}

const InteractionSchema = new Schema<IInteraction>({
    session_id: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    participant_id: { type: String, required: true },
    cognitive_type: { type: String, enum: ['S1', 'S2'], required: true },
    initiative: { type: String, enum: ['System', 'User'], required: true },
    feature_type: { type: String, required: true },
    writing_context: String, // [NEW] Full text context
    trigger_metrics: {
        revision_ratio: Number,
        pause_duration: Number,
        cpm: Number
    },
    focal_segment: String,
    ai_response: Schema.Types.Mixed,
    user_action: { type: String, enum: ['ACCEPT', 'REJECT', 'IGNORE'], default: 'IGNORE' },
    selected_option: String,
    latency: Number,
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.models.Interaction || mongoose.model<IInteraction>('Interaction', InteractionSchema);
