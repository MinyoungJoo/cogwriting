import { useEffect, useRef } from 'react';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';

export function useMonitor() {
    const {
        keystrokes,
        content,
        setWpm,
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
            useStore.getState().setWpm(monitorAgent.getWpm());
            useStore.getState().setCognitiveState(monitorAgent.getCognitiveState());
            useStore.getState().setActionHistory(monitorAgent.getActionHistory());

            // Sync detailed metrics
            useStore.getState().setMetrics({
                docLength: monitorAgent.getDocLength(),
                pauseDuration: monitorAgent.getPauseDuration(),
                cursorPos: monitorAgent.getCursorPos(),
                editRatio: monitorAgent.getEditRatio()
            });

            // Check for intervention triggers
            const payload = monitorAgent.check_status();

            // If payload is returned (Stuck detected), trigger intervention
            if (payload) {
                console.log('Stuck detected, payload:', payload);
                useStore.getState().setPendingPayload(payload);
                useStore.getState().setInterventionStatus('detected');
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [setWpm, setPhase, setCognitiveState, setActionHistory, addChatMessage]);

    return monitorAgent;
}
