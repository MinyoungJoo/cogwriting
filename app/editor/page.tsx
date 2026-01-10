'use client';

import { useSearchParams } from 'next/navigation';
import MonitorPanel from '@/components/monitor/MonitorPanel';
import AssistPanel from '@/components/assist/AssistPanel';
import Editor from '@/components/editor/Editor';
import { useMonitor } from '@/src/hooks/useMonitor';
import { Suspense, useEffect } from 'react';
import useStore from '@/store/useStore';
import { api } from '@/src/lib/api';

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

    // Initialize Participant
    const { setParticipantId, setWritingGenre, setWritingTopic, setWritingPrompt, setWritingAudience, setSessionId } = useStore();
    useEffect(() => {
        const initParticipant = async () => {
            const pid = searchParams.get('pid');
            const genre = searchParams.get('genre') as 'creative' | 'argumentative' | null;
            const topicId = searchParams.get('topic');

            if (genre) setWritingGenre(genre);

            if (topicId) {
                // If a specific topic ID is provided, look it up and override the default
                const { getTopicById } = await import('@/src/lib/topics');
                const topicDef = getTopicById(topicId);
                if (topicDef) {
                    setWritingTopic(topicDef.id); // [MODIFIED] Store ID for Display
                    setWritingPrompt(topicDef.prompt); // [NEW] Store Prompt for AI
                    setWritingAudience(topicDef.audience);
                    console.log('Set Topic:', topicDef.id, 'Prompt:', topicDef.prompt);
                }
            }

            if (pid) {
                // Optimistically set PID from URL so Modal has it immediately
                setParticipantId(pid);

                try {
                    // 1. Try to get existing first
                    await api.participants.get(pid);
                    console.log(`Participant ${pid} found.`);
                } catch (e) {
                    console.warn(`Participant ${pid} not found, creating new...`);
                    // Create new if not found
                    try {
                        const newParticipant = await api.participants.create({
                            _id: pid,
                            assigned_topic: topicId,
                            assigned_group: modeParam || 'hybrid',
                            assigned_genre: genre || 'argumentative'
                        });
                        // Update store with potentially new ID (if server ignored ours)
                        setParticipantId(newParticipant._id);
                    } catch (createErr) {
                        console.error("Failed to create participant", createErr);
                    }
                }
            } else {
                // No PID in URL, create anonymous
                try {
                    const newP = await api.participants.create({
                        assigned_topic: topicId,
                        assigned_group: modeParam || 'hybrid',
                        assigned_genre: genre || 'argumentative',
                        _id: `anon_${Date.now()}` // Provide ID for anon too if API requires it, or trust API validation.
                        // API validation says !body._id is error. So we MUST provide valid ID.
                        // But usually anon creation implies we don't have one.
                        // Let's generate a random one or timestamp.
                    });
                    setParticipantId(newP._id);
                } catch (e) {
                    console.error("Failed to create anonymous participant", e);
                }
            }

            // ...

            // [FIX] Removed redundant session creation. 
            // Expect GoalSettingModal to create the session with User Goal & Metadata.
            // If the user is just monitoring, we might need logic here, but for now we enforce Goal Setting.

        };
        initParticipant();
    }, [searchParams, modeParam, setParticipantId, setWritingGenre, setWritingTopic, setWritingAudience]);

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
