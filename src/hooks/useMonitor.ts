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
            setCognitiveState(monitorAgent.getCognitiveState());
            setActionHistory(monitorAgent.getActionHistory());

            // Sync detailed metrics
            setMetrics({
                docLength: monitorAgent.getDocLength(),
                pauseDuration: monitorAgent.getPauseDuration(),
                cursorPos: monitorAgent.getCursorPos(),
                editRatio: monitorAgent.getEditRatio()
            });

            // Check for intervention triggers
            const payload = monitorAgent.check_status();

            // If payload is returned (Stuck detected or Flow Trigger), trigger intervention
            if (payload) {
                console.log('Intervention detected, payload:', payload);
                useStore.getState().setPendingPayload(payload);
                // Always wait for manual user acceptance
                useStore.getState().setInterventionStatus('detected');
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [setPhase, setCognitiveState, setActionHistory, addChatMessage]);

    return monitorAgent;
}
