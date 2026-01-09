'use client';

import { useSearchParams } from 'next/navigation';
import MonitorPanel from '@/components/monitor/MonitorPanel';
import AssistPanel from '@/components/assist/AssistPanel';
import Editor from '@/components/editor/Editor';
import { useMonitor } from '@/src/hooks/useMonitor';
import { Suspense, useEffect } from 'react';
import useStore from '@/store/useStore';

import GoalSettingModal from '@/components/GoalSettingModal';

function EditorContent() {
    const searchParams = useSearchParams();
    const modeParam = searchParams.get('mode');

    const showMonitor = modeParam === 'monitor';
    const { setSystemMode, isGoalSet } = useStore();

    // Set System Mode based on URL param
    useEffect(() => {
        if (modeParam === 's1') setSystemMode('s1');
        else if (modeParam === 's2') setSystemMode('s2');
        else setSystemMode('hybrid');
    }, [modeParam, setSystemMode]);

    // Initialize the monitor hook
    useMonitor();

    // Determine if AssistPanel should be shown
    // S1 mode: Text Editor only (No Chat)
    // S2 mode: Text Editor + Chat
    // Hybrid: Text Editor + Chat
    const showAssistPanel = modeParam !== 's1';

    return (
        <main className="flex h-screen w-full bg-white overflow-hidden relative">
            {!isGoalSet && <GoalSettingModal />}
            {showMonitor && <MonitorPanel />}
            <div className="flex-1 p-6 bg-gray-100">
                <Editor />
            </div>
            {showAssistPanel && <AssistPanel />}
        </main>
    );
}

export default function EditorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditorContent />
        </Suspense>
    );
}
