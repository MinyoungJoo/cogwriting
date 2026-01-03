import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Phase, CognitiveState, StrategyID, Strategy, selectStrategy } from '@/src/lib/strategy';
import { MonitorPayload, monitorAgent } from '@/src/lib/MonitorAgent';

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
    suggestionHistory: string[];
    suggestionIndex: number;

    // Intervention State
    interventionStatus: 'idle' | 'detected' | 'requesting' | 'completed';
    isStruggleDetected: boolean;
    setStruggleDetected: (detected: boolean) => void;
    struggleDiagnosis: { logic: string; structure: string; tone: string } | null;
    setStruggleDiagnosis: (diagnosis: { logic: string; structure: string; tone: string } | null) => void;
    struggleContext: { focalSegment: string; fullText: string } | null; // Store context for follow-up
    acceptStruggleDiagnosis: (type: 'logic' | 'structure' | 'tone') => void;
    isIdeaSparkDetected: boolean;
    setIdeaSparkDetected: (detected: boolean) => void;
    pendingPayload: MonitorPayload | null;

    // Detailed Metrics
    docLength: number;
    pauseDuration: number;
    cursorPos: number;
    editRatio: number;
    revisionRatio: number; // New metric for short-term struggle detection

    addKeystroke: (k: Keystroke) => void;
    setContent: (c: string) => void;
    updateMetrics: () => void;
    setCpm: (w: number) => void;
    setPhase: (p: Phase) => void;
    setCognitiveState: (s: CognitiveState) => void;
    setActionHistory: (h: Array<{ time: number; event_code: string }>) => void;
    addChatMessage: (msg: ChatMessage, sessionId?: string) => void;
    setSelectedStrategy: (id: StrategyID | null) => void;
    setSuggestionOptions: (opts: string[] | null) => void;
    setGhostText: (text: string | null) => void;
    addToHistory: (text: string) => void;
    navigateHistory: (direction: -1 | 1) => void;
    setGhostTextReplacementLength: (len: number) => void;
    setGhostTextPosition: (pos: { key: string; offset: number } | null) => void;
    setMetrics: (metrics: { docLength: number; pauseDuration: number; cursorPos: number; editRatio: number; revisionRatio: number }) => void;

    // Intervention Actions
    setInterventionStatus: (status: 'idle' | 'detected' | 'requesting' | 'completed') => void;
    setPendingPayload: (payload: MonitorPayload | null) => void;
    triggerIntervention: (forceStrategyId?: string, silent?: boolean, customPrompt?: string, customTriggerReason?: string, contextData?: any) => Promise<void>;

    // Feedback State
    feedbackItems: Array<{
        id: string;
        trigger: string;
        context: string;
        nodeKey: string | null;
        offset: number | null;
        resolved: boolean;
        timestamp: number;
        strategyId?: string; // Link to chat session
    }>;
    focusedFeedbackId: string | null;

    addFeedbackItem: (item: { trigger: string; context: string; nodeKey: string | null; offset: number | null; strategyId?: string }) => void;
    resolveFeedbackItem: (id: string) => void;
    setFocusedFeedbackId: (id: string | null) => void;

    // Settings
    isSystemInitiatedEnabled: boolean;
    toggleSystemInitiated: () => void;

    // Writing Prompt (Pinned Topic)
    activeWritingPrompt: string | null;
    setActiveWritingPrompt: (prompt: string | null) => void;

    // System Mode
    systemMode: 'hybrid' | 's1' | 's2';
    setSystemMode: (mode: 'hybrid' | 's1' | 's2') => void;

    // Writing Genre
    writingGenre: 'creative' | 'argumentative' | null;
    setWritingGenre: (genre: 'creative' | 'argumentative' | null) => void;
}

const useStore = create<AppState>()(persist((set, get) => ({
    activeWritingPrompt: null,
    setActiveWritingPrompt: (prompt) => set({ activeWritingPrompt: prompt }),

    systemMode: 'hybrid',
    setSystemMode: (mode) => set({ systemMode: mode }),

    writingGenre: null,
    setWritingGenre: (genre) => set({ writingGenre: genre }),

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
    suggestionHistory: [],
    suggestionIndex: -1,

    feedbackItems: [],
    focusedFeedbackId: null,

    isSystemInitiatedEnabled: true,

    interventionStatus: 'idle',
    isStruggleDetected: false,
    setStruggleDetected: (detected) => set({ isStruggleDetected: detected }),
    struggleDiagnosis: null,
    setStruggleDiagnosis: (diagnosis) => set({ struggleDiagnosis: diagnosis }),
    struggleContext: null,
    acceptStruggleDiagnosis: (type) => {
        const { struggleDiagnosis, addChatMessage, triggerIntervention } = get();
        if (struggleDiagnosis) {
            // Extend cooldown for Struggle Detection since user accepted help
            monitorAgent.extendCooldown('STRUGGLE_DETECTION', 60);

            let targetStrategy: StrategyID = 'S2_LOGIC_AUDITOR';
            let diagnosisText = '';

            switch (type) {
                case 'logic':
                    targetStrategy = 'S2_LOGIC_AUDITOR';
                    diagnosisText = struggleDiagnosis.logic;
                    break;
                case 'structure':
                    targetStrategy = 'S2_STRUCTURAL_MAPPING';
                    diagnosisText = struggleDiagnosis.structure;
                    break;
                case 'tone':
                    targetStrategy = 'S2_TONE_REFINEMENT';
                    diagnosisText = struggleDiagnosis.tone;
                    break;
            }

            set({
                selectedStrategy: targetStrategy,
                isStruggleDetected: false,
                struggleDiagnosis: null,
                interventionStatus: 'idle' // Reset status to allow future triggers
            });

            // 1. Add the Diagnosis as a starting point in chat
            addChatMessage({
                role: 'assistant',
                content: `[Diagnosis]: ${diagnosisText}`,
                strategy: targetStrategy
            }, targetStrategy);

            // 2. Automatically trigger detailed feedback
            // We pass the diagnosis as context for the detailed analysis
            const { struggleContext } = get();
            triggerIntervention(
                targetStrategy,
                false,
                `The user has received this diagnosis: "${diagnosisText}". Please provide a detailed analysis and specific improvement suggestions based on this diagnosis.`,
                undefined,
                struggleContext // Pass the saved context (focalSegment, fullText)
            );
        }
    },
    isIdeaSparkDetected: false,
    setIdeaSparkDetected: (detected) => set({ isIdeaSparkDetected: detected }),
    pendingPayload: null,

    docLength: 0,
    pauseDuration: 0,
    cursorPos: 0,
    editRatio: 0,
    revisionRatio: 1.0,

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
    addToHistory: (text) => set((state) => {
        const newHistory = [...state.suggestionHistory, text];
        return {
            suggestionHistory: newHistory,
            suggestionIndex: newHistory.length - 1,
            ghostText: text
        };
    }),
    navigateHistory: (direction) => set((state) => {
        const newIndex = state.suggestionIndex + direction;
        if (newIndex >= 0 && newIndex < state.suggestionHistory.length) {
            return {
                suggestionIndex: newIndex,
                ghostText: state.suggestionHistory[newIndex]
            };
        }
        return {};
    }),
    setGhostTextReplacementLength: (len) => set({ ghostTextReplacementLength: len }),
    setGhostTextPosition: (pos) => set({ ghostTextPosition: pos }),
    setMetrics: (metrics) => set(metrics),

    updateMetrics: () => {
        const payload = monitorAgent.check_status();

        // Handle System Initiated Triggers
        if (payload && get().isSystemInitiatedEnabled) {
            set({ pendingPayload: payload });
            get().triggerIntervention();
        }

        set({
            cpm: monitorAgent.getCpm(),
            phase: monitorAgent.getPhase(),
            cognitiveState: monitorAgent.getCognitiveState(),
            actionHistory: monitorAgent.getActionHistory(),
            docLength: monitorAgent.getDocLength(),
            pauseDuration: monitorAgent.getPauseDuration(),
            cursorPos: monitorAgent.getCursorPos(),
            editRatio: monitorAgent.getEditRatio(),
            revisionRatio: monitorAgent.getRevisionRatio(),
        });
    },

    addFeedbackItem: (item) => set((state) => ({
        feedbackItems: [
            ...state.feedbackItems,
            {
                id: Math.random().toString(36).substring(7),
                ...item,
                resolved: false,
                timestamp: Date.now()
            }
        ]
    })),
    resolveFeedbackItem: (id) => set((state) => ({
        feedbackItems: state.feedbackItems.map(i => i.id === id ? { ...i, resolved: true } : i)
    })),
    setFocusedFeedbackId: (id) => set({ focusedFeedbackId: id }),

    toggleSystemInitiated: () => set((state) => ({ isSystemInitiatedEnabled: !state.isSystemInitiatedEnabled })),

    setInterventionStatus: (status) => set({ interventionStatus: status }),
    setPendingPayload: (payload) => set({ pendingPayload: payload }),

    triggerIntervention: async (forceStrategyId?: string, silent: boolean = false, customPrompt?: string, customTriggerReason?: string, contextData?: any) => {
        const { phase, cognitiveState, pendingPayload, selectedStrategy, interventionStatus } = get();

        // Prevent duplicate calls if already requesting
        if (interventionStatus === 'requesting') {
            console.warn('[triggerIntervention] Already requesting, skipping.');
            return;
        }

        // If Struggle Detection triggered, just update UI state
        // If Struggle Detection triggered, just update UI state
        if (pendingPayload && pendingPayload.trigger_reason === 'STRUGGLE_DETECTION' && !forceStrategyId) {
            set({ isStruggleDetected: true });

            // Get context snippet
            const { content, cursorPos, pauseDuration, revisionRatio } = get();
            const start = Math.max(0, cursorPos - 10);
            const end = Math.min(content.length, cursorPos + 10);
            const snippet = content.slice(start, end).replace(/\n/g, ' ');

            // Log to Monitor Panel
            get().addFeedbackItem({
                trigger: 'Struggle Detected',
                context: `Ratio: ${(revisionRatio * 100).toFixed(0)}%, Idle: ${pauseDuration.toFixed(1)}s | "${snippet}..."`,
                nodeKey: null,
                offset: null
            });

            return;
        }

        // If Idea Spark triggered, just update UI state
        if (pendingPayload && pendingPayload.trigger_reason === 'IDEA_SPARK' && !forceStrategyId) {
            console.log('[triggerIntervention] Early return for Idea Spark Nudge');
            set({ isIdeaSparkDetected: true });

            // Get context snippet
            const { content, cursorPos, pauseDuration } = get();
            const start = Math.max(0, cursorPos - 10);
            const end = Math.min(content.length, cursorPos + 10);
            const snippet = content.slice(start, end).replace(/\n/g, ' ');

            // Log to Monitor Panel
            get().addFeedbackItem({
                trigger: 'Idea Spark',
                context: `Idle: ${pauseDuration.toFixed(1)}s | "${snippet}..."`,
                nodeKey: null,
                offset: null
            });

            return;
        }

        if (!pendingPayload) {
            console.log('[triggerIntervention] No pending payload');
            return;
        }

        // 1. Determine Strategy
        let strategy: Strategy | null = null;

        if (forceStrategyId) {
            const { getStrategy } = require('@/src/lib/strategy');
            strategy = getStrategy(forceStrategyId);
        } else if (selectedStrategy) {
            const { getStrategy } = require('@/src/lib/strategy');
            strategy = getStrategy(selectedStrategy);
        } else if (pendingPayload) {
            // Auto-select based on trigger reason
            const { getStrategy } = require('@/src/lib/strategy');
            switch (pendingPayload.trigger_reason) {
                case 'GHOST_TEXT':
                    strategy = getStrategy('S1_GHOST_TEXT');
                    break;
                case 'IDEA_SPARK':
                    strategy = getStrategy('S1_IDEA_SPARK');
                    break;
                default:
                    strategy = selectStrategy(phase, cognitiveState);
            }
            if (!strategy && pendingPayload.trigger_reason) {
                switch (pendingPayload.trigger_reason) {
                    case 'LOGIC_AUDITOR': strategy = getStrategy('S2_LOGIC_AUDITOR'); break;
                    case 'STRUCTURAL_MAPPING': strategy = getStrategy('S2_STRUCTURAL_MAPPING'); break;
                    case 'THIRD_PARTY_AUDITOR': strategy = getStrategy('S2_THIRD_PARTY_AUDITOR'); break;
                    case 'EVIDENCE_SUPPORT': strategy = getStrategy('S2_EVIDENCE_SUPPORT'); break;
                    case 'TONE_REFINEMENT': strategy = getStrategy('S1_TONE_REFINEMENT'); break;
                }
            }
        } else {
            strategy = selectStrategy(phase, cognitiveState);
        }

        if (!strategy) {
            console.warn('Strategy not found');
            if (!silent) set({ interventionStatus: 'idle' });
            return;
        }

        if (!silent) {
            set({ interventionStatus: 'requesting' });
            set({ selectedStrategy: strategy.id });

            // Save context for follow-up diagnosis
            if (strategy.id === 'S2_DIAGNOSIS' && contextData) {
                set({ struggleContext: contextData });
            }
        }

        // Optimization: Check cache for Idea Spark
        if (strategy.id === 'S1_IDEA_SPARK' && !forceStrategyId) {
            const { suggestionOptions } = get();
            if (suggestionOptions && suggestionOptions.length > 0) {
                console.log('Using cached Idea Spark suggestions');
                if (!silent) set({ interventionStatus: 'completed' });
                return;
            }
        }

        const chatHistory = get().chatSessions[strategy.id] || [];

        try {
            // 2. Call API
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy_id: strategy.id,
                    system_instruction: strategy.systemInstruction,
                    writing_context: pendingPayload?.writing_context || get().content, // Fallback to full content
                    chat_history: chatHistory,
                    user_prompt: customPrompt || pendingPayload?.user_prompt || null,
                    context_data: {
                        ...(contextData || {}),
                        writingGenre: get().writingGenre
                    }
                })
            });
            const data = await res.json();

            if (data.system_prompt) {
                console.log('%c--- SYSTEM PROMPT ---', 'color: #00ff00; font-weight: bold;');
                console.log(data.system_prompt);
                console.log('%c---------------------', 'color: #00ff00; font-weight: bold;');
            }
            console.log('API Response Data:', data);

            // 3. Route Response
            const isSystem2 = strategy.id.startsWith('S2_');

            if (isSystem2) {
                if (strategy.id === 'S2_DIAGNOSIS') {
                    try {
                        // Direct JSON response from API (no suggestion_content wrapper)
                        const rawData = data;
                        console.log('[Diagnosis] Raw API Data:', rawData);

                        // Normalize keys to lowercase
                        const diagnosisData: any = {};
                        Object.keys(rawData).forEach(key => {
                            diagnosisData[key.toLowerCase()] = rawData[key];
                        });

                        console.log('[Diagnosis] Normalized Data:', diagnosisData);

                        if (diagnosisData.logic || diagnosisData.structure || diagnosisData.tone) {
                            // Store diagnosis and wait for user acceptance
                            console.log('[Diagnosis] Setting store state with:', diagnosisData);
                            set({
                                struggleDiagnosis: {
                                    logic: diagnosisData.logic || '진단 내용 없음',
                                    structure: diagnosisData.structure || '진단 내용 없음',
                                    tone: diagnosisData.tone || '진단 내용 없음'
                                },
                                interventionStatus: 'completed' // Mark API call as done
                            });
                            console.log('[Diagnosis] State updated:', get().struggleDiagnosis);
                        } else {
                            // Fallback if keys are missing but JSON is valid
                            console.warn('[Diagnosis] JSON parsed but keys missing:', diagnosisData);
                            set({
                                struggleDiagnosis: {
                                    logic: JSON.stringify(diagnosisData).slice(0, 100) + '...',
                                    structure: '형식 불일치',
                                    tone: '형식 불일치'
                                },
                                interventionStatus: 'completed'
                            });
                        }
                    } catch (e) {
                        console.error('[Diagnosis] Parsing Error:', e);
                        // Fallback: Show error in the box or just the raw text?
                        // Let's show the raw text as a "General" diagnosis in the Logic field for now, 
                        // so the user sees SOMETHING.
                        set({
                            struggleDiagnosis: {
                                logic: data.suggestion_content.slice(0, 100) + '...',
                                structure: '분석 실패',
                                tone: '분석 실패'
                            },
                            interventionStatus: 'completed'
                        });
                    }
                } else if (data.suggestion_content) {
                    get().addChatMessage({
                        role: 'assistant',
                        content: data.suggestion_content,
                        strategy: strategy.id
                    }, strategy.id);
                }
            } else if (strategy.id === 'S1_GHOST_TEXT' || strategy.id === 'S1_DRAFTING') {
                // Ghost Text / Drafting -> Show as Ghost Text Overlay
                const text = data.replacement_text || data.suggestion_content;
                if (text) {
                    console.log('[Store] Setting Ghost Text:', text);
                    set({ ghostText: text });
                }
            } else if (strategy.id === 'S1_IDEA_SPARK') {
                if (data.suggestion_options) {
                    set({ suggestionOptions: data.suggestion_options });
                }
            } else if (cognitiveState === 'Block') {
                if (data.suggestion_options) {
                    set({ suggestionOptions: data.suggestion_options });
                }
                if (data.suggestion_content) {
                    get().addChatMessage({
                        role: 'assistant',
                        content: data.suggestion_content,
                        strategy: strategy.id
                    }, strategy.id);
                }
            } else {
                if (data.replacement_text) {
                    get().addToHistory(data.replacement_text);
                } else if (data.suggestion_content) {
                    get().addToHistory(data.suggestion_content);
                }
            }

            if (!silent) set({ interventionStatus: 'completed' });

        } catch (error) {
            console.error('Intervention failed:', error);
            if (!silent) set({ interventionStatus: 'idle' });
        }
    }
}), {
    name: 'adaptive-writer-storage',
    partialize: (state) => ({
        // chatSessions: state.chatSessions, // Removed to reset on refresh
        isSystemInitiatedEnabled: state.isSystemInitiatedEnabled,
    }),
}));

export default useStore;
