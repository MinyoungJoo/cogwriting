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
                editRatio: monitorAgent.getEditRatio()
            });

            // System Trigger 1: Ghost Text (10s Pause)
            // Only trigger if not already triggered and no ghost text active
            // pauseDuration is in seconds
            // if (pauseDuration >= 10 && pauseDuration < 11) {
            //     const { ghostText, interventionStatus } = useStore.getState();
            //     if (!ghostText && interventionStatus === 'idle') {
            //         console.log('System Trigger: 10s Pause (Ghost Text)');
            //         useStore.getState().setSelectedStrategy('S1_GHOST_TEXT');
            //         useStore.getState().triggerIntervention();
            //     }
            // }

            // System Trigger 2: Brainstorming (20s Pause)
            // Trigger Brainstorming options (Labels)
            // if (pauseDuration >= 20 && pauseDuration < 21) {
            //     const { interventionStatus } = useStore.getState();
            //     // We can trigger this even if Ghost Text is there (maybe replace it or show alongside)
            //     // For now, let's just trigger it.
            //     // if (interventionStatus !== 'requesting') {
            //     //     console.log('System Trigger: 20s Pause (Brainstorming)');
            //     //     useStore.getState().setSelectedStrategy('S1_BRAINSTORMING');
            //     //     useStore.getState().triggerIntervention();
            //     // }
            // }

            // Check for intervention triggers
            // const payload = monitorAgent.check_status();

            // // If payload is returned (Stuck detected or Flow Trigger), trigger intervention
            // if (payload) {
            //     console.log('Intervention detected, payload:', payload);
            //     useStore.getState().setPendingPayload(payload);
            //     // Always wait for manual user acceptance
            //     useStore.getState().setInterventionStatus('detected');
            // }

        }, 1000);

        return () => clearInterval(interval);
    }, [setPhase, setCognitiveState, setActionHistory, addChatMessage]);

    return monitorAgent;
}
