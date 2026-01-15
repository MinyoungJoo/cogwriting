import { Phase, CognitiveState } from './strategy';
import { api } from '@/src/lib/api';
import useStore from '@/store/useStore';

export interface LogEntry {
    timestamp: number;
    from_phase: Phase;
    to_phase: Phase;
}

export interface MonitorPayload {
    current_phase: Phase;
    cognitive_state: CognitiveState;
    stuck_duration: number;
    state_history: LogEntry[];
    writing_context: string;
    trigger_reason: string;
    user_prompt: string | null;
}

export class MonitorAgent {
    private STUCK_THRESHOLD = 5.0; // 5 seconds (Block state)
    private WINDOW_SIZE = 30; // Sliding window size for keys

    private last_action_time: number;
    private last_trigger_time: number;
    private action_history: Array<{ time: number; event_code: string }>;
    private key_history: string[]; // Store 'EDIT' or 'TYPE'
    private state_history_log: LogEntry[];

    private current_text: string;
    private cursor_index: number;

    private current_phase: Phase;
    private current_state: CognitiveState;

    // New WPM Tracking Fields
    private start_time: number;
    private prev_text_length: number;
    private total_chars_typed: number;

    // New Advanced Metrics
    private last_burst_length: number; // P-Burst
    private current_burst_length: number;

    private revision_count_in_sentence: number; // Immediate Revision
    private keystrokes_in_current_sentence: number; // Total keystrokes in current sentence
    private distant_revision_count: number; // Distant Revision

    // Struggle Detection
    private recent_keystrokes: { type: 'BACKSPACE' | 'SPACE' | 'ENTER' | 'CHAR', time: number, burst_len: number }[];

    private total_pause_time: number;
    private total_active_time: number;

    // Trigger Cooldowns
    private trigger_cooldowns: Record<string, number>;

    // Backend Logging
    private log_buffer: Array<{ t: number; k: string; type: string; pos: number }> = [];
    private flush_interval: NodeJS.Timeout;

    constructor() {
        this.last_action_time = Date.now() / 1000;
        this.last_trigger_time = 0;
        this.action_history = [];
        this.key_history = [];
        this.state_history_log = [];
        this.current_text = '';
        this.cursor_index = 0;
        this.current_phase = 'Planning';
        this.current_state = 'Flow';

        // WPM Init
        this.start_time = Date.now();
        this.prev_text_length = 0;
        this.total_chars_typed = 0;

        // Advanced Metrics Init
        this.last_burst_length = 0;
        this.current_burst_length = 0;
        this.revision_count_in_sentence = 0;
        this.keystrokes_in_current_sentence = 0;
        this.distant_revision_count = 0;
        this.recent_keystrokes = [];
        this.total_pause_time = 0;
        this.total_active_time = 0;
        this.trigger_cooldowns = {};

        // Start Flush Loop (5s)
        this.flush_interval = setInterval(() => this.flush_logs(), 5000);
    }

    private async snapshot_content() {
        const sessionId = useStore.getState().sessionId;
        const currentContent = this.current_text;

        if (!sessionId || !currentContent) return;

        try {
            // We can re-use the interaction log or a specific 'snapshot' event in logs
            // For now, let's log it as a special event type in the log stream
            this.log_buffer.push({
                t: Date.now(),
                k: 'AUTO_SNAPSHOT',
                type: 'SNAPSHOT', // Custom type needing support or just treated as info
                pos: this.cursor_index
            });
            // We could also potentially update the Session document's "last_content" field directly if we had an endpoint
            // but logging it ensures playback integrity.

            // To be safe, let's also force a flush
            this.flush_logs();
        } catch (e) {
            console.error('[Monitor] Failed to snapshot content', e);
        }
    }

    public async forceFlush() {
        await this.snapshot_content(); // Take a final snapshot
        await this.flush_logs();
    }

    private async flush_logs() {
        if (this.log_buffer.length === 0) return;

        const sessionId = useStore.getState().sessionId;
        if (!sessionId) {
            // Keep buffer but maybe limit size to prevent overflow if session never starts?
            if (this.log_buffer.length > 5000) this.log_buffer = [];
            return;
        }

        const batch = [...this.log_buffer];
        this.log_buffer = []; // Clear immediate

        try {
            await api.logs.save({
                session_id: sessionId,
                events: batch
            });
            console.log(`[Monitor] Flushed ${batch.length} logs.`);
        } catch (e) {
            console.error('[Monitor] Failed to flush logs', e);
            // Restore? Or drop to avoid issues. Drop is safer for prototype.
        }
    }

    // Called on KeyDown (for EditRatio)
    public on_input_event(event_code: string) {
        const current_time = Date.now() / 1000;
        const idle_time = current_time - this.last_action_time;

        // Update Pause/Active Time
        if (idle_time > 2.0) {
            this.total_pause_time += idle_time;
            // End of Burst
            if (this.current_burst_length > 0) {
                this.last_burst_length = this.current_burst_length;
                this.current_burst_length = 0;
            }
        } else {
            this.total_active_time += idle_time;
        }

        this.last_action_time = current_time;
        this.action_history.push({ time: current_time, event_code });

        // Update Key History
        const review_keys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        let keyType = 'TYPE';

        if (review_keys.includes(event_code)) {
            keyType = 'EDIT';
            // Revision Logic
            if (event_code === 'Backspace' || event_code === 'Delete') {
                // Check if immediate or distant
                // Simplified: If cursor is at end, it's immediate. Else distant.
                if (this.cursor_index >= this.current_text.length - 1) {
                    this.revision_count_in_sentence++;
                } else {
                    this.distant_revision_count++;
                }
            }
        } else if (event_code === 'Enter') {
            keyType = 'ENTER';
            this.revision_count_in_sentence = 0; // Reset on new line
            this.keystrokes_in_current_sentence = 0;
        } else {
            // Typing
            this.current_burst_length++;
        }

        this.keystrokes_in_current_sentence++;

        // Track for Struggle Detection (New Logic)
        let specificType: 'BACKSPACE' | 'SPACE' | 'ENTER' | 'CHAR' = 'CHAR';
        if (event_code === 'Backspace' || event_code === 'Delete') specificType = 'BACKSPACE';
        else if (event_code === 'Enter') specificType = 'ENTER';
        else if (event_code === ' ' || event_code === 'Space') specificType = 'SPACE';

        this.recent_keystrokes.push({
            type: specificType,
            time: Date.now(),
            burst_len: this.current_burst_length
        });

        // Keep only last 100 for efficiency (though we slice in check_status, keeping array small is good)
        if (this.recent_keystrokes.length > 200) {
            this.recent_keystrokes.shift();
        }

        this.key_history.push(keyType);
        if (this.key_history.length > this.WINDOW_SIZE) {
            this.key_history.shift();
        }


        // Any input means Flow
        this.current_state = 'Flow';

        // Buffer for Backend Log
        let logType: 'INPUT' | 'DELETE' | 'NC' = 'INPUT';
        if (event_code === 'Backspace' || event_code === 'Delete') logType = 'DELETE';
        else if (event_code.startsWith('Arrow') || event_code === 'Home' || event_code === 'End' || event_code === 'PageUp' || event_code === 'PageDown') logType = 'NC';

        // Don't log modifier key presses alone (Shift/Ctrl/Alt) unless we want to track them as NC?
        // User schema says INPUT|DELETE|NC. 
        // For now, let's treat modifiers as NC.
        else if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(event_code)) logType = 'NC';

        this.log_buffer.push({
            t: current_time * 1000, // ms for backend
            k: event_code,
            type: logType,
            pos: this.cursor_index
        });
    }

    // Called on Text Change (for WPM & Context)
    public update_content(text: string, cursor_index: number) {
        this.current_text = text;
        this.cursor_index = cursor_index;

        // WPM Logic (Korean Optimized)
        const delta = Math.abs(text.length - this.prev_text_length);
        if (delta < 50) { // Ignore large pastes
            this.total_chars_typed += delta;
        }
        this.prev_text_length = text.length;
    }

    public check_status(): MonitorPayload | null {
        const now = Date.now() / 1000;
        const idle_time = now - this.last_action_time;

        // Burst Logic: Reset burst if idle > 2s
        if (idle_time > 2.0 && this.current_burst_length > 0) {
            this.last_burst_length = this.current_burst_length;
            this.current_burst_length = 0;
        }

        // Logic C: Advanced Triggers
        // Helper to check cooldown (Cooldowns store the TIMESTAMP when it becomes available)
        const checkCooldown = (trigger: string, standard_cooldown: number) => {
            const next_available = this.trigger_cooldowns[trigger] || 0;

            if (now >= next_available) {
                // Trigger is available!
                // Set default cooldown for next time (can be overridden by extendCooldown)
                this.trigger_cooldowns[trigger] = now + standard_cooldown;
                return true;
            }
            return false;
        };


        // 1. Struggle Detection (New Logic)
        // Window: Last 100 keystrokes
        // Condition: Revision Ratio < 0.6 AND Idle >= 4.0s
        if (idle_time >= 5.0) {
            const WINDOW_SIZE = 100;
            const recent = this.recent_keystrokes.slice(-WINDOW_SIZE);

            // Debug Log
            // console.log(`[Monitor] Idle: ${idle_time.toFixed(1)}s, Keystrokes: ${recent.length}/${WINDOW_SIZE}`);

            // [MODIFIED] Condition: Activate if Document Length >= 100 characters
            if (this.current_text.length >= 100) {
                const backspaceCount = recent.filter(k => k.type === 'BACKSPACE').length;
                const nonCharCount = recent.filter(k => k.type === 'SPACE' || k.type === 'ENTER').length;

                // Revision Ratio Calculation
                // Use actual sample size if less than WINDOW_SIZE to avoid division by zero or skewed results
                const totalSample = recent.length > 0 ? recent.length : 1;

                // Effective Contribution = Total - (BS * 2) - NonChar
                const effectiveContribution = totalSample - (backspaceCount * 2) - nonCharCount;
                const revisionRatio = (effectiveContribution + nonCharCount) / totalSample;

                // console.log(`[Monitor] Revision Ratio: ${revisionRatio.toFixed(2)} (Threshold: 0.6)`);

                // Condition: Efficiency < 60%
                if (revisionRatio < 0.6) {
                    if (checkCooldown('STRUGGLE_DETECTION', 60)) {
                        console.log(`[Monitor] Struggle Detected! Ratio: ${revisionRatio.toFixed(2)}`);
                        // Prevent Idea Spark from triggering immediately after
                        return this.create_payload('STRUGGLE_DETECTION');
                    }
                }
            }
        }

        // 2. Idea Spark (Idle >= 8.0s)
        // Trigger a nudge to offer help (On-demand)
        if (idle_time >= 10.0) {
            // [MODIFIED] If a Writing Prompt is already pinned (user selected one), do NOT trigger Idea Spark again.
            // The user considers Idea Spark "done" if the prompt is visible.
            if (checkCooldown('IDEA_SPARK', 60)) {
                return this.create_payload('IDEA_SPARK');
            }
        }

        return null;
    }

    public extendCooldown(trigger: string, seconds: number) {
        // Set absolute timestamp for next availability
        this.trigger_cooldowns[trigger] = (Date.now() / 1000) + seconds;
        console.log(`[Monitor] Extended cooldown for ${trigger} by ${seconds}s`);
    }

    public resetCooldown(trigger: string) {
        if (this.trigger_cooldowns[trigger]) {
            delete this.trigger_cooldowns[trigger];
            console.log(`[Monitor] Reset cooldown for ${trigger}`);
        }
    }

    private reported_block: boolean = false;

    // Context Helpers
    private isInterWordPause(): boolean {
        const charBefore = this.current_text[this.cursor_index - 1];
        // Space or normal char, NOT sentence end
        return charBefore === ' ' || (!!charBefore && !'.?!'.includes(charBefore));
    }

    private isSentenceEndPause(): boolean {
        const charBefore = this.current_text[this.cursor_index - 1];
        return '.?!'.includes(charBefore || '');
    }

    private isParagraphEndPause(): boolean {
        const charBefore = this.current_text[this.cursor_index - 1];
        return charBefore === '\n';
    }

    private getLastSegmentLength(): number {
        // Find length of text from last paragraph break (or start) to cursor
        const textBeforeCursor = this.current_text.substring(0, this.cursor_index - 1); // Exclude current \n
        const lastNewline = textBeforeCursor.lastIndexOf('\n');
        if (lastNewline === -1) return textBeforeCursor.length;
        return textBeforeCursor.length - lastNewline - 1;
    }

    private get_summary_history(): LogEntry[] {
        return this.state_history_log.slice(-5);
    }

    private get_cursor_context(): string {
        const start_pos = Math.max(0, this.cursor_index - 500);
        const end_pos = Math.min(this.current_text.length, this.cursor_index + 200);
        const text_chunk = this.current_text.substring(start_pos, end_pos);
        const relative_cursor_pos = this.cursor_index - start_pos;
        return text_chunk.substring(0, relative_cursor_pos) + ' [CURSOR] ' + text_chunk.substring(relative_cursor_pos);
    }

    public manual_trigger(user_prompt: string): MonitorPayload {
        return this.create_payload('USER_PROMPT', user_prompt);
    }

    public manual_trigger_with_replacement(user_prompt: string, mask_length: number, replacement_text: string): MonitorPayload {
        // 1. Get normal context
        const context = this.get_cursor_context();

        // 2. Find [CURSOR] position
        const cursor_marker = ' [CURSOR] ';
        const cursor_pos = context.indexOf(cursor_marker);

        if (cursor_pos !== -1) {
            // 3. Replace text before cursor with replacement_text
            const pre_cursor_text = context.substring(0, cursor_pos);
            const post_cursor_text = context.substring(cursor_pos + cursor_marker.length);

            if (pre_cursor_text.length >= mask_length) {
                const masked_pre_text = pre_cursor_text.slice(0, -mask_length) + ' ' + replacement_text + ' ';
                const masked_context = masked_pre_text + post_cursor_text;
                return this.create_payload('USER_PROMPT', user_prompt, masked_context);
            }
        }

        return this.create_payload('USER_PROMPT', user_prompt);
    }

    private create_payload(reason: string, user_prompt: string | null = null, context_override: string | null = null): MonitorPayload {
        return {
            current_phase: this.current_phase,
            cognitive_state: this.current_state,
            stuck_duration: (Date.now() / 1000) - this.last_action_time,
            state_history: this.get_summary_history(),
            writing_context: context_override || this.get_cursor_context(),
            trigger_reason: reason,
            user_prompt: user_prompt,
        };
    }

    // Getters for UI
    public getPhase() { return this.current_phase; }
    public getCognitiveState() { return this.current_state; }

    public getCpm() {
        const now = Date.now();
        const minutes = (now - this.start_time) / 60000;
        if (minutes < 0.1) return 0;
        return this.total_chars_typed / minutes;
    }

    public getActionHistory() { return this.action_history; }
    public getDocLength() { return this.current_text.length; }
    public getPauseDuration() { return Math.floor((Date.now() / 1000) - this.last_action_time); }
    public getCursorPos() { return this.cursor_index; }
    public getEditRatio() {
        const edit_count = this.key_history.filter(k => k === 'EDIT').length;
        const total_count = this.key_history.length;
        return total_count > 0 ? (edit_count / total_count) : 0;
    }

    public getRevisionRatio() {
        // Window: Last 100 keystrokes
        const WINDOW_SIZE = 100;
        // Get last 100 keystrokes (no time pruning for this metric, just last N actions)
        const recent = this.recent_keystrokes.slice(-WINDOW_SIZE);

        if (recent.length === 0) return 1.0; // Default to 100% efficiency if no data

        const backspaceCount = recent.filter(k => k.type === 'BACKSPACE').length;
        // Formula: (100 - 2*BS) / 100
        // We use the actual length if < 100 for early feedback
        const total = recent.length;

        // Effective Contribution = Total - (BS * 2) - NonChar
        // Ratio = (Effective + NonChar) / Total
        // Simplified: (Total - 2*BS) / Total

        const ratio = (total - (backspaceCount * 2)) / total;
        return Math.max(0, ratio); // Clamp to 0
    }

    public resetSession() {
        console.log('[MonitorAgent] Session Reset');
        this.last_action_time = Date.now() / 1000;
        this.last_trigger_time = 0;
        this.action_history = [];
        this.key_history = [];
        this.state_history_log = [];

        // WPM Init
        this.start_time = Date.now();
        this.prev_text_length = 0;
        this.total_chars_typed = 0;

        // Advanced Metrics Init
        this.last_burst_length = 0;
        this.current_burst_length = 0;
        this.revision_count_in_sentence = 0;
        this.keystrokes_in_current_sentence = 0;
        this.distant_revision_count = 0;
        this.recent_keystrokes = [];
        this.total_pause_time = 0;
        this.total_active_time = 0;
        this.trigger_cooldowns = {};

        this.current_phase = 'Planning';
        this.current_state = 'Flow';
    }
}

export const monitorAgent = new MonitorAgent();
