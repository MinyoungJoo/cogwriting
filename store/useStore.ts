import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Phase, CognitiveState, StrategyID, Strategy, selectStrategy, getStrategy } from '@/src/lib/strategy';
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
    // Intervention State
    interventionStatus: 'idle' | 'detected' | 'requesting' | 'completed' | 'failed';
    isStruggleDetected: boolean;
    setStruggleDetected: (detected: boolean) => void;
    struggleDiagnosis: { logic: string; structure: string; tone: string } | null;
    setStruggleDiagnosis: (diagnosis: { logic: string; structure: string; tone: string } | null) => void;
    struggleContext: { focalSegment: string; fullText: string } | null;
    acceptStruggleDiagnosis: (type: 'logic' | 'structure' | 'tone') => void;
    unreadDiagnosis: Record<string, boolean>;
    markDiagnosisRead: (id: string) => void;
    acceptMultipleDiagnoses: (types: string[]) => void;
    isIdeaSparkDetected: boolean;
    setIdeaSparkDetected: (detected: boolean) => void;
    pendingPayload: MonitorPayload | null;

    // Detailed Metrics
    docLength: number;
    pauseDuration: number;
    cursorPos: number;
    editRatio: number;
    revisionRatio: number;

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
    setInterventionStatus: (status: 'idle' | 'detected' | 'requesting' | 'completed' | 'failed') => void;
    setPendingPayload: (payload: MonitorPayload | null) => void;
    triggerIntervention: (overrideContextData?: any, targetStrategyId?: StrategyID) => Promise<void>;

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

    // Goal Setting
    writingTopic: string | null;
    setWritingTopic: (topic: string) => void;
    writingAudience: string | null;
    setWritingAudience: (audience: string) => void;
    userGoal: string | null;
    setUserGoal: (goal: string) => void;
    isGoalSet: boolean;
    setIsGoalSet: (isSet: boolean) => void;
}

const useStore = create<AppState>()(persist((set, get) => ({
    activeWritingPrompt: null,
    setActiveWritingPrompt: (prompt) => set({ activeWritingPrompt: prompt }),

    systemMode: 'hybrid',
    setSystemMode: (mode) => set({ systemMode: mode }),

    writingGenre: null,
    setWritingGenre: (genre) => {
        let topic = '';
        let audience = '';

        if (genre === 'creative') {
            topic = '최근 인상 깊었던 실제 경험을 하나 떠올려서 1인칭 주인공 시점의 영화 시나리오 쓰기';
            audience = '소설을 즐기는 일반 독자';
        } else if (genre === 'argumentative') {
            topic = 'AI 생성 이미지 콘텐츠는 예술의 진입 장벽을 낮추는 혁신인가, 창작의 의미를 붕괴시키는가?를 주제에 대해 의견과 근거를 적기.';
            audience = '글쓰기 선생님, 교수님';
        }

        set({
            writingGenre: genre,
            writingTopic: topic,
            writingAudience: audience
        });
    },

    // Goal Setting Defaults & Actions
    writingTopic: '최근 인상 깊었던 실제 경험을 하나 떠올려서 1인칭 주인공 시점의 영화 시나리오를 써보세요', // Predefined default
    setWritingTopic: (topic) => set({ writingTopic: topic }),
    writingAudience: 'General Audience', // Predefined default
    setWritingAudience: (audience) => set({ writingAudience: audience }),
    userGoal: null,
    setUserGoal: (goal) => set({ userGoal: goal }),
    isGoalSet: false,
    setIsGoalSet: (isSet) => set({ isGoalSet: isSet }),

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
                interventionStatus: 'idle'
            });

            addChatMessage({
                role: 'assistant',
                content: `[Diagnosis]: ${diagnosisText}`,
                strategy: targetStrategy
            }, targetStrategy);

            const currentPayload = get().pendingPayload || {
                trigger_reason: 'STRUGGLE_DETECTION', // Default context if missing
                current_phase: get().phase,
                cognitive_state: get().cognitiveState,
                stuck_duration: 0,
                state_history: [],
                writing_context: get().content,
                user_prompt: null
            };
            const payload = { ...currentPayload, writing_context: get().content, user_prompt: "Please provide detailed feedback on this diagnosis." };
            get().setPendingPayload(payload);
            triggerIntervention(undefined, targetStrategy);
        }
    },

    acceptMultipleDiagnoses: (types: string[]) => {
        const { struggleDiagnosis, addChatMessage, triggerIntervention } = get();
        if (struggleDiagnosis && types.length > 0) {
            monitorAgent.extendCooldown('STRUGGLE_DETECTION', 60);

            const strategiesToTrigger: { id: StrategyID, text: string, name: string }[] = [];

            // Map selections to strategies
            for (const type of types) {
                if (type === 'logic') {
                    strategiesToTrigger.push({
                        id: 'S2_LOGIC_AUDITOR',
                        text: struggleDiagnosis.logic,
                        name: 'Logic'
                    });
                }
                if (type === 'structure') {
                    strategiesToTrigger.push({
                        id: 'S2_STRUCTURAL_MAPPING',
                        text: struggleDiagnosis.structure,
                        name: 'Structure'
                    });
                }
                if (type === 'tone') {
                    strategiesToTrigger.push({
                        id: 'S2_TONE_REFINEMENT',
                        text: struggleDiagnosis.tone,
                        name: 'Tone'
                    });
                }
            }

            if (strategiesToTrigger.length === 0) return;

            // 1. Distribute Messages to Respective Tools
            strategiesToTrigger.forEach(strat => {
                addChatMessage({
                    role: 'assistant',
                    content: `[Diagnosis]: ${strat.text}\n\n글쓰기의 **${strat.name}**에 대한 심층 분석을 진행하겠습니다.`,
                    strategy: strat.id
                }, strat.id);
            });

            // 2. Activate the FIRST tool in UI
            const primaryStrategy = strategiesToTrigger[0];

            set({
                selectedStrategy: primaryStrategy.id,
                isStruggleDetected: false,
                struggleDiagnosis: null
            });

            // 3. Trigger Analysis for ALL selected tools (Parallel)
            strategiesToTrigger.forEach(strat => {
                const payloadOverride = {
                    writing_context: get().content,
                    user_prompt: `Based on the diagnosis: "${strat.text}", please provide a detailed audit and actionable suggestions.`
                };
                triggerIntervention(payloadOverride, strat.id);
            });
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

            if (payload.trigger_reason === 'STRUGGLE_DETECTION') {
                set({ isStruggleDetected: true });
            } else if (payload.trigger_reason === 'IDEA_SPARK') {
                set({ isIdeaSparkDetected: true });
            }
            // Do NOT auto-trigger otherwise.
            // Explicitly ignore other reasons unless we add logic for them.
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

    unreadDiagnosis: {},
    markDiagnosisRead: (id) => set((state) => ({ unreadDiagnosis: { ...state.unreadDiagnosis, [id]: false } })),

    triggerIntervention: async (overrideContextData?: any, targetStrategyId?: StrategyID) => {
        const { selectedStrategy, content } = get();



        let strategyIdToUse = targetStrategyId || selectedStrategy;

        // Auto-select fallback logic
        if (!strategyIdToUse) {
            const payload: any = get().pendingPayload;

            if (payload && payload.trigger_reason) {
                switch (payload.trigger_reason) {

                    case 'IDEA_SPARK': strategyIdToUse = 'S1_IDEA_SPARK'; break;
                    case 'IDEA_SPARK_PREFETCH': strategyIdToUse = 'S1_IDEA_SPARK'; break;
                    case 'LOGIC_AUDITOR': strategyIdToUse = 'S2_LOGIC_AUDITOR'; break;
                    case 'STRUCTURAL_MAPPING': strategyIdToUse = 'S2_STRUCTURAL_MAPPING'; break;
                    case 'THIRD_PARTY_AUDITOR': strategyIdToUse = 'S2_THIRD_PARTY_AUDITOR'; break;
                    case 'EVIDENCE_SUPPORT': strategyIdToUse = 'S2_EVIDENCE_SUPPORT'; break;
                    case 'TONE_REFINEMENT': strategyIdToUse = 'S2_TONE_REFINEMENT'; break;
                    case 'STRUGGLE_DETECTION': strategyIdToUse = 'S2_DIAGNOSIS'; break;
                }
            }

            if (!strategyIdToUse) {
                const autoFunc = selectStrategy(get().phase, get().cognitiveState);
                if (autoFunc) strategyIdToUse = autoFunc.id;
            }
        }

        if (!strategyIdToUse) {
            console.warn('No strategy selected for intervention');
            return;
        }

        const strategy = getStrategy(strategyIdToUse as StrategyID);

        if (!strategy) {
            console.warn('Strategy object not found for ID:', strategyIdToUse);
            set({ interventionStatus: 'idle' });
            return;
        }

        set({ interventionStatus: 'requesting' });

        // Construct Payload
        let payload: any = get().pendingPayload || {};
        if (!get().pendingPayload) {
            payload = monitorAgent.manual_trigger(`Analysis Request for ${strategy.id}`);
            payload.writing_context = get().content;
        }

        // Merge overrides
        if (overrideContextData) {
            payload = { ...payload, ...overrideContextData };
        }

        // Meta Layer Injection
        const metaContext = {
            writingGenre: get().writingGenre,
            writingTopic: get().writingTopic,
            writingAudience: get().writingAudience,
            userGoal: get().userGoal
        };
        payload = { ...payload, ...metaContext };

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [],
                    ...payload,
                    strategy_id: strategy.id, // Ensure consistent naming (API uses strategy_id)
                    system_instruction: strategy.systemInstruction,
                    context_data: {
                        fullText: get().content,
                        focalSegment: payload.writing_context || get().content,
                        ...metaContext
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to fetch suggestion');

            const data = await response.json();

            // Handle System 2 Diagnosis Response
            const isSystem2 = strategy.id.startsWith('S2_');

            if (isSystem2 && strategy.id === 'S2_DIAGNOSIS') {
                // Special handling for Diagnosis Result Parsing (JSON)
                try {
                    const rawData = data;
                    let diagnosisData: any = {};

                    // 1. Flatten top-level keys
                    Object.keys(rawData).forEach(key => diagnosisData[key.toLowerCase()] = rawData[key]);

                    // 2. Check for nested 'diagnosis', 'result', or 'analysis' object
                    if (!diagnosisData.logic && !diagnosisData.structure) {
                        const potentialNested = diagnosisData.diagnosis || diagnosisData.analysis || diagnosisData.result || diagnosisData.output;
                        if (potentialNested && typeof potentialNested === 'object') {
                            Object.keys(potentialNested).forEach(key => diagnosisData[key.toLowerCase()] = potentialNested[key]);
                        }
                    }

                    // 3. Check for stringified JSON in 'suggestion_content' or 'content'
                    if (!diagnosisData.logic && !diagnosisData.structure) {
                        const stringfields = ['suggestion_content', 'content', 'message'];
                        for (const field of stringfields) {
                            if (typeof diagnosisData[field] === 'string' && diagnosisData[field].trim().startsWith('{')) {
                                try {
                                    const parsedNested = JSON.parse(diagnosisData[field]);
                                    Object.keys(parsedNested).forEach(key => diagnosisData[key.toLowerCase()] = parsedNested[key]);
                                } catch (e) { /* ignore parse error */ }
                            }
                        }
                    }

                    // 4. Map Korean Keys if present
                    if (diagnosisData.논리) diagnosisData.logic = diagnosisData.논리;
                    if (diagnosisData.구조) diagnosisData.structure = diagnosisData.구조;
                    if (diagnosisData.어조) diagnosisData.tone = diagnosisData.어조;
                    if (diagnosisData.태도) diagnosisData.tone = diagnosisData.태도; // Tone alias

                    if (diagnosisData.logic || diagnosisData.structure || diagnosisData.tone) {
                        set({
                            struggleDiagnosis: {
                                logic: diagnosisData.logic || 'No content',
                                structure: diagnosisData.structure || 'No content',
                                tone: diagnosisData.tone || 'No content'
                            },
                            interventionStatus: 'completed'
                        });
                    } else {
                        console.warn('Diagnosis Keys Missing:', Object.keys(diagnosisData));
                        set({
                            struggleDiagnosis: {
                                logic: (data.suggestion_content || JSON.stringify(data)).slice(0, 150),
                                structure: 'Format Mismatch',
                                tone: 'Format Mismatch'
                            },
                            interventionStatus: 'completed'
                        });
                    }
                } catch (e) {
                    console.error('Diagnosis Parse Error', e);
                    set({ interventionStatus: 'failed' });
                }
            } else {
                const content = data.suggestion_content || data.message || data.content || "Analysis complete.";

                get().addChatMessage({
                    role: 'assistant',
                    content: content,
                    strategy: strategy.id
                }, strategy.id);

                // S1 Ghost Text / Markup Strategies Robust Handling
                if (['S1_REFINEMENT', 'S1_GAP_FILLING', 'S1_IDEA_EXPANSION', 'S1_PATTERN_BREAKER', 'S1_DRAFTING'].includes(strategy.id)) {
                    let replacement = data.replacement_text;
                    if (!replacement && typeof content === 'string') {
                        // Fallback: Use content but strip quotes or markdown or parentheses if needed
                        replacement = content.replace(/^["'(\[]|["')\]]$/g, '').trim();
                    }
                    if (replacement) {
                        set({ ghostText: replacement });
                    }
                }

                if (strategy.id === 'S1_IDEA_SPARK') {
                    if (data.suggestion_options) {
                        set({ suggestionOptions: data.suggestion_options });
                    } else if (Array.isArray(data.content)) {
                        set({ suggestionOptions: data.content });
                    }
                }

                set({ pendingPayload: null, interventionStatus: 'idle' });
            }

        } catch (error) {
            console.error(error);
            set({ interventionStatus: 'failed' });
        }
    },
}), {
    name: 'adaptive-writer-storage',
    partialize: (state) => ({
        // chatSessions: state.chatSessions, // Removed to reset on refresh
        isSystemInitiatedEnabled: state.isSystemInitiatedEnabled,
        // isGoalSet: state.isGoalSet, // Removed to show modal on refresh
        writingTopic: state.writingTopic,
        writingAudience: state.writingAudience,
        userGoal: state.userGoal,
        writingGenre: state.writingGenre,
        activeWritingPrompt: state.activeWritingPrompt,
    }),
}));

export default useStore;
