import { useEffect, useRef } from 'react';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';

export function useMonitor() {
    const {
        keystrokes,
        content,
        setPhase,
        setCognitiveState,
        addChatMessage,
        setActionHistory
    } = useStore();

    const lastKeystrokeCountRef = useRef(0);

    // Sync keystrokes and content to MonitorAgent is now handled by MonitorPlugins


    // Periodic check
    useEffect(() => {
        const interval = setInterval(() => {
            // Sync state to store
            useStore.getState().setPhase(monitorAgent.getPhase());
            const { setCpm, setPhase, setCognitiveState, setActionHistory, setMetrics, setInterventionStatus, setPendingPayload } = useStore.getState();

            // 1. Update basic metrics
            setCpm(monitorAgent.getCpm());
            setPhase(monitorAgent.getPhase());
            setActionHistory(monitorAgent.getActionHistory());

            const pauseDuration = monitorAgent.getPauseDuration();

            // Update pause duration in store
            useStore.getState().setMetrics({
                docLength: monitorAgent.getDocLength(),
                pauseDuration: pauseDuration,
                cursorPos: monitorAgent.getCursorPos(),
                editRatio: monitorAgent.getEditRatio(),
                revisionRatio: monitorAgent.getRevisionRatio()
            });

            // Check for intervention triggers
            const payload = monitorAgent.check_status();

            // If payload is returned (Stuck detected or Flow Trigger), trigger intervention
            if (payload) {
                const { isSystemInitiatedEnabled, interventionStatus } = useStore.getState();

                // If System Initiated is disabled, ignore system triggers
                // Also ignore if an intervention is already active (not idle)
                // AND ignore if a nudge is currently displayed (isStruggleDetected / isIdeaSparkDetected)
                const { isStruggleDetected, isIdeaSparkDetected, systemMode } = useStore.getState();
                if (isSystemInitiatedEnabled && interventionStatus === 'idle' && !isStruggleDetected && !isIdeaSparkDetected) {
                    console.log('Intervention detected, payload:', payload);

                    // Filter triggers based on System Mode
                    if (systemMode === 's1' && payload.trigger_reason === 'STRUGGLE_DETECTION') {
                        console.log('[Monitor] Skipping Struggle Detection (S1 Mode)');
                        return;
                    }
                    if (systemMode === 's2' && payload.trigger_reason === 'IDEA_SPARK') {
                        console.log('[Monitor] Skipping Idea Spark (S2 Mode)');
                        return;
                    }

                    useStore.getState().setPendingPayload(payload);

                    if (payload.trigger_reason === 'STRUGGLE_DETECTION' || payload.trigger_reason === 'IDEA_SPARK') {
                        // For Struggle Detection and Idea Spark Nudge, we just want to update the UI state immediately
                        // triggerIntervention in useStore handles setting isStruggleDetected/isIdeaSparkDetected = true
                        useStore.getState().triggerIntervention();
                    } else {
                        // For others, we set status to 'detected' and let the UI/Plugins handle the handoff
                        useStore.getState().setInterventionStatus('detected');
                    }
                }
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [setPhase, setCognitiveState, setActionHistory, addChatMessage]);

    return monitorAgent;
}
