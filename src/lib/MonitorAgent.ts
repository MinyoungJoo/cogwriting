import { Phase, CognitiveState } from './strategy';

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
    }

    // Called on KeyDown (for EditRatio)
    public on_input_event(event_code: string) {
        const current_time = Date.now() / 1000;
        this.last_action_time = current_time;
        this.action_history.push({ time: current_time, event_code });

        // Update Key History
        const review_keys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        let keyType = 'TYPE';
        if (review_keys.includes(event_code)) {
            keyType = 'EDIT';
        } else if (event_code === 'Enter') {
            keyType = 'ENTER';
        }

        this.key_history.push(keyType);
        if (this.key_history.length > this.WINDOW_SIZE) {
            this.key_history.shift();
        }

        // Any input means Flow
        this.current_state = 'Flow';
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

        // Logic A: Cognitive State (Flow vs Block)
        if (idle_time >= this.STUCK_THRESHOLD) {
            this.current_state = 'Block';
        } else {
            this.current_state = 'Flow';
        }

        // Logic B: Phase Detection
        const detected_phase = this.calculate_phase();
        if (detected_phase !== this.current_phase) {
            const log_entry: LogEntry = {
                timestamp: now,
                from_phase: this.current_phase,
                to_phase: detected_phase,
            };
            this.state_history_log.push(log_entry);
            this.current_phase = detected_phase;
            console.log(`LOG: Phase changed to ${this.current_phase}`);
        }

        // Logic C: Triggers

        // 1. Stuck Trigger (Block Detected)
        // We need to track if we have already reported this Block.
        // Let's use `reported_block` flag.

        if (this.current_state === 'Block' && !this.reported_block) {
            this.reported_block = true;
            return this.create_payload('TIME_STUCK');
        }

        if (this.current_state === 'Flow') {
            this.reported_block = false;
        }

        // 2. Flow Trigger (Ghost Text)
        // Idle > 2s, Translating OR Reviewing, Flow (not Block)
        if (idle_time > 2.0 && this.current_state === 'Flow' && (this.current_phase === 'Translating' || this.current_phase === 'Reviewing')) {
            const time_since_last_trigger = now - this.last_trigger_time;
            if (time_since_last_trigger > 10.0) {
                this.last_trigger_time = now;
                return this.create_payload('FLOW_TRIGGER');
            }
        }

        return null;
    }

    private reported_block: boolean = false;

    private calculate_phase(): Phase {
        const doc_length = this.current_text.length;
        const cpm = this.getCpm();
        const pause_duration = this.getPauseDuration();

        const edit_count = this.key_history.filter(k => k === 'EDIT').length;
        const enter_count = this.key_history.filter(k => k === 'ENTER').length;
        const total_count = this.key_history.length;

        const edit_ratio = total_count > 0 ? (edit_count / total_count) : 0;
        const enter_rate = total_count > 0 ? (enter_count / total_count) : 0;

        // 1. Planning Phase
        // DocLength < 50 AND (Pause > 5s OR EnterKeyRate > 0.3)
        if (doc_length < 50) {
            if (pause_duration > 5 || enter_rate > 0.3) {
                return 'Planning';
            }
            // If typing fast at start, treat as Translating
            return 'Translating';
        }

        // 2. Reviewing vs Translating (DocLength >= 50)
        const is_cursor_back = (doc_length - this.cursor_index) > 20; // Cursor moved up significantly

        // Reviewing Rules: CPM < 100 OR EditRatio > 0.3 OR Cursor moved up
        if (cpm < 100 || edit_ratio > 0.3 || is_cursor_back) {
            return 'Reviewing';
        }

        // Default to Translating (covers CPM > 150, EditRatio < 0.2, Cursor at end)
        return 'Translating';
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

    private create_payload(reason: string, user_prompt: string | null = null): MonitorPayload {
        return {
            current_phase: this.current_phase,
            cognitive_state: this.current_state,
            stuck_duration: (Date.now() / 1000) - this.last_action_time,
            state_history: this.get_summary_history(),
            writing_context: this.get_cursor_context(),
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
}

export const monitorAgent = new MonitorAgent();
