import { create } from 'zustand';
import { Phase, CognitiveState, StrategyID, Strategy, selectStrategy } from '@/src/lib/strategy';
import { MonitorPayload } from '@/src/lib/MonitorAgent';

interface Keystroke {
    key: string;
    timestamp: number;
    action: 'keydown' | 'keyup' | 'compositionend';
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    strategy?: string;
}

interface AppState {
    keystrokes: Keystroke[];
    content: string;
    cpm: number;
    phase: Phase;
    cognitiveState: CognitiveState; // Replaces isStuck
    actionHistory: Array<{ time: number; event_code: string }>;
    chatSessions: Record<string, ChatMessage[]>; // Replaces chatMessages
    selectedStrategy: StrategyID | null;
    suggestionOptions: string[] | null;
    ghostText: string | null; // New Ghost Text State
    ghostTextReplacementLength: number; // How many chars to replace (for Markup strategies)
    ghostTextPosition: { key: string; offset: number } | null; // Custom insertion position

    // Intervention State
    interventionStatus: 'idle' | 'detected' | 'requesting' | 'completed';
    pendingPayload: MonitorPayload | null;

    // Detailed Metrics
    docLength: number;
    pauseDuration: number;
    cursorPos: number;
    editRatio: number;

    addKeystroke: (k: Keystroke) => void;
    setContent: (c: string) => void;
    setCpm: (w: number) => void;
    setPhase: (p: Phase) => void;
    setCognitiveState: (s: CognitiveState) => void;
    setActionHistory: (h: Array<{ time: number; event_code: string }>) => void;
    addChatMessage: (msg: ChatMessage, sessionId?: string) => void;
    setSelectedStrategy: (id: StrategyID | null) => void;
    setSuggestionOptions: (opts: string[] | null) => void;
    setGhostText: (text: string | null) => void;
    setGhostTextReplacementLength: (len: number) => void;
    setGhostTextPosition: (pos: { key: string; offset: number } | null) => void;
    setMetrics: (metrics: { docLength: number; pauseDuration: number; cursorPos: number; editRatio: number }) => void;

    // Intervention Actions
    setInterventionStatus: (status: 'idle' | 'detected' | 'requesting' | 'completed') => void;
    setPendingPayload: (payload: MonitorPayload | null) => void;
    triggerIntervention: () => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
    keystrokes: [],
    content: '',
    cpm: 0,
    phase: 'Planning',
    cognitiveState: 'Flow',
    actionHistory: [],
    chatSessions: { 'GENERAL': [] }, // Default session
    selectedStrategy: null,
    suggestionOptions: null,
    ghostText: null,
    ghostTextReplacementLength: 0,
    ghostTextPosition: null,

    interventionStatus: 'idle',
    pendingPayload: null,

    docLength: 0,
    pauseDuration: 0,
    cursorPos: 0,
    editRatio: 0,

    addKeystroke: (k) => set((state) => ({ keystrokes: [...state.keystrokes, k] })),
    setContent: (c) => set({ content: c }),
    setCpm: (w) => set({ cpm: w }),
    setPhase: (p) => set({ phase: p }),
    setCognitiveState: (s) => set({ cognitiveState: s }),
    setActionHistory: (h) => set({ actionHistory: h }),

    addChatMessage: (msg, sessionId) => set((state) => {
        const targetSession = sessionId || (state.selectedStrategy || 'GENERAL');
        const currentSessionMessages = state.chatSessions[targetSession] || [];
        return {
            chatSessions: {
                ...state.chatSessions,
                [targetSession]: [...currentSessionMessages, msg]
            }
        };
    }),

    setSelectedStrategy: (id) => set({ selectedStrategy: id }),
    setSuggestionOptions: (opts) => set({ suggestionOptions: opts }),
    setGhostText: (text) => set({ ghostText: text }),
    setGhostTextReplacementLength: (len) => set({ ghostTextReplacementLength: len }),
    setGhostTextPosition: (pos) => set({ ghostTextPosition: pos }),
    setMetrics: (metrics) => set(metrics),

    setInterventionStatus: (status) => set({ interventionStatus: status }),
    setPendingPayload: (payload) => set({ pendingPayload: payload }),

    triggerIntervention: async () => {
        const { phase, cognitiveState, pendingPayload, selectedStrategy } = get();
        if (!pendingPayload) return;

        // 1. Determine Strategy
        let strategy: Strategy | null = null;

        if (selectedStrategy) {
            const { getStrategy } = require('@/src/lib/strategy');
            strategy = getStrategy(selectedStrategy);
        } else {
            strategy = selectStrategy(phase, cognitiveState);
        }

        if (!strategy) {
            set({ interventionStatus: 'idle' });
            return;
        }

        set({ interventionStatus: 'requesting', selectedStrategy: strategy.id });

        try {
            // 2. Call API with Simplified Payload
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy_id: strategy.id,
                    system_instruction: strategy.systemInstruction,
                    writing_context: pendingPayload.writing_context
                })
            });
            const data = await res.json();

            if (data.system_prompt) {
                console.log('%c--- SYSTEM PROMPT ---', 'color: #00ff00; font-weight: bold;');
                console.log(data.system_prompt);
                console.log('%c---------------------', 'color: #00ff00; font-weight: bold;');
            }

            // 3. Route Response based on Strategy Type and Cognitive State
            const isSystem2 = strategy.id.startsWith('S2_');

            if (isSystem2) {
                // System 2 -> Always Chat (in its own session)
                if (data.suggestion_content) {
                    get().addChatMessage({
                        role: 'assistant',
                        content: data.suggestion_content,
                        strategy: strategy.id
                    }, strategy.id);
                }
            } else if (cognitiveState === 'Block') {
                // Block (System 1) -> Sidebar (Cards/Chat)
                if (data.suggestion_options) {
                    set({ suggestionOptions: data.suggestion_options });
                }
                if (data.suggestion_content) {
                    // System 1 Block strategies usually go to GENERAL or their own?
                    // Let's put them in their own session if selected, or GENERAL if auto-triggered?
                    // If auto-triggered (no selectedStrategy), maybe GENERAL?
                    // But here strategy.id is set. Let's use strategy.id for consistency if it's a distinct strategy.
                    // Or keep S1 in GENERAL? The user said "Each chat window independent".
                    // Let's use strategy.id.
                    get().addChatMessage({
                        role: 'assistant',
                        content: data.suggestion_content,
                        strategy: strategy.id
                    }, strategy.id);
                }
            } else {
                // Flow (System 1) -> Editor (Ghost Text)
                if (data.replacement_text) {
                    set({ ghostText: data.replacement_text });
                } else if (data.suggestion_content) {
                    set({ ghostText: data.suggestion_content });
                }
            }

            set({ interventionStatus: 'completed' });

        } catch (error) {
            console.error('Intervention failed:', error);
            set({ interventionStatus: 'idle' });
        }
    }
}));

export default useStore;
