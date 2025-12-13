import { create } from 'zustand';
import { Phase, CognitiveState, StrategyID, Strategy, selectStrategy } from '@/src/lib/strategy';
import { MonitorPayload } from '@/src/lib/MonitorAgent';

interface Keystroke {
    key: string;
    timestamp: number;
    action: 'keydown' | 'keyup';
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    strategy?: string;
}

interface AppState {
    keystrokes: Keystroke[];
    content: string;
    wpm: number;
    phase: Phase;
    cognitiveState: CognitiveState; // Replaces isStuck
    actionHistory: Array<{ time: number; event_code: string }>;
    chatMessages: ChatMessage[];
    selectedStrategy: StrategyID | null;
    suggestionOptions: string[] | null;
    ghostText: string | null; // New Ghost Text State

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
    setWpm: (w: number) => void;
    setPhase: (p: Phase) => void;
    setCognitiveState: (s: CognitiveState) => void;
    setActionHistory: (h: Array<{ time: number; event_code: string }>) => void;
    addChatMessage: (msg: ChatMessage) => void;
    setSelectedStrategy: (id: StrategyID | null) => void;
    setSuggestionOptions: (opts: string[] | null) => void;
    setGhostText: (text: string | null) => void;
    setMetrics: (metrics: { docLength: number; pauseDuration: number; cursorPos: number; editRatio: number }) => void;

    // Intervention Actions
    setInterventionStatus: (status: 'idle' | 'detected' | 'requesting' | 'completed') => void;
    setPendingPayload: (payload: MonitorPayload | null) => void;
    triggerIntervention: () => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
    keystrokes: [],
    content: '',
    wpm: 0,
    phase: 'Planning',
    cognitiveState: 'Flow',
    actionHistory: [],
    chatMessages: [],
    selectedStrategy: null,
    suggestionOptions: null,
    ghostText: null,

    interventionStatus: 'idle',
    pendingPayload: null,

    docLength: 0,
    pauseDuration: 0,
    cursorPos: 0,
    editRatio: 0,

    addKeystroke: (k) => set((state) => ({ keystrokes: [...state.keystrokes, k] })),
    setContent: (c) => set({ content: c }),
    setWpm: (w) => set({ wpm: w }),
    setPhase: (p) => set({ phase: p }),
    setCognitiveState: (s) => set({ cognitiveState: s }),
    setActionHistory: (h) => set({ actionHistory: h }),
    addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
    setSelectedStrategy: (id) => set({ selectedStrategy: id }),
    setSuggestionOptions: (opts) => set({ suggestionOptions: opts }),
    setGhostText: (text) => set({ ghostText: text }),
    setMetrics: (metrics) => set(metrics),

    setInterventionStatus: (status) => set({ interventionStatus: status }),
    setPendingPayload: (payload) => set({ pendingPayload: payload }),

    triggerIntervention: async () => {
        const { phase, cognitiveState, pendingPayload } = get();
        if (!pendingPayload) return;

        // 1. Determine Strategy
        const strategy = selectStrategy(phase, cognitiveState);

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

            // 3. Route Response based on Cognitive State
            if (cognitiveState === 'Block') {
                // Block -> Sidebar (Chat/Cards)
                if (data.suggestion_options) {
                    set({ suggestionOptions: data.suggestion_options });
                }
                if (data.suggestion_content) {
                    set((state) => ({
                        chatMessages: [...state.chatMessages, {
                            role: 'assistant',
                            content: data.suggestion_content,
                            strategy: strategy.id // Include Strategy ID
                        }]
                    }));
                }
            } else {
                // Flow -> Editor (Ghost Text)
                if (data.suggestion_content) {
                    set({ ghostText: data.suggestion_content });
                }
            }

            set({ interventionStatus: 'completed' });

            // Reset Ghost Text after 5s if not used? Or let GhostTextPlugin handle it.
            // For now, keep it simple.

        } catch (error) {
            console.error('Intervention failed:', error);
            set({ interventionStatus: 'idle' });
        }
    }
}));

export default useStore;
