'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { TextNode } from 'lexical';
import GhostTextPlugin from './GhostTextPlugin';
import MarkupTriggerPlugin from './MarkupTriggerPlugin';
import { KeystrokeMonitorPlugin, TextChangePlugin } from './MonitorPlugins';
import SelectionMenuPlugin from './SelectionMenuPlugin';
import SystemFeedbackPlugin from './SystemFeedbackPlugin';
import IdeaSparkPlugin from './IdeaSparkPlugin';
import { StruggleNudge } from './StruggleNudge';

const theme = {
    paragraph: 'mb-2',
};

function onError(error: Error) {
    console.error(error);
}

import { X, Pin, Target, PenLine, Check, CheckCircle, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { useState } from 'react';

const GoalHeader = () => {
    const userGoal = useStore(state => state.userGoal);
    const writingTopic = useStore(state => state.writingTopic);
    const writingPrompt = useStore(state => state.writingPrompt); // [NEW]
    const setUserGoal = useStore(state => state.setUserGoal);
    const isGoalSet = useStore(state => state.isGoalSet);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    if (!isGoalSet) return null;

    const handleEdit = () => {
        setEditValue(userGoal || '');
        setIsEditing(true);
    };

    const handleSave = () => {
        if (editValue.trim()) {
            setUserGoal(editValue);
        }
        setIsEditing(false);
    };

    return (
        <div className="w-full bg-gray-50/80 backdrop-blur border-b border-gray-200 px-4 py-2 flex items-start gap-3 shrink-0 animate-in fade-in slide-in-from-top-1 z-10">
            <Target size={14} className="text-gray-500 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
                {/* [NEW] Topic Display - Plain Text */}
                {writingTopic && (
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Topic:</span>
                        <span className="text-sm text-gray-900 font-medium truncate max-w-full">
                            {writingPrompt || writingTopic}
                        </span>
                    </div>
                )}

                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Current Goal</div>

                {isEditing ? (
                    <div className="flex gap-2 items-center">
                        <input
                            autoFocus
                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                        />
                        <button onClick={handleSave} className="text-green-600 hover:text-green-700 p-1"><Check size={14} /></button>
                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                    </div>
                ) : (
                    <div className="group flex items-start gap-2">
                        {/* Goal - Gray Box */}
                        <div className="text-sm text-gray-800 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 leading-snug shadow-sm max-w-full w-fit break-words whitespace-normal" title={userGoal || ''}>
                            {userGoal || 'No goal set'}
                        </div>
                        <button
                            onClick={handleEdit}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500 mt-1"
                            title="Edit Goal"
                        >
                            <PenLine size={12} />
                        </button>
                    </div>
                )}
            </div>
            {/* Save Button */}
            <SaveButton />
        </div>
    );
};

// Separate component for Save Button
import { api } from '@/src/lib/api';

const SaveButton = () => {
    const participantId = useStore(state => state.participantId);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const router = useRouter();

    const handleFinish = async () => {
        if (!participantId || isSaving) return;

        if (!confirm('Are you sure you want to finish writing and save?')) return;

        setIsSaving(true);
        try {
            // [NEW] Flush any pending logs/keystrokes immediately
            const { monitorAgent } = await import('@/src/lib/MonitorAgent');
            await monitorAgent.forceFlush();

            const currentContent = useStore.getState().content; // Get latest content
            const sessionId = useStore.getState().sessionId;

            // 1. Mark Participant as Completed
            await api.participants.update(participantId, { is_completed: true });

            // 2. Mark Session as Completed & Save Final Content
            if (sessionId) {
                await api.sessions.update({
                    _id: sessionId,
                    final_text: currentContent || '', // Save explicitly
                    'time_metrics.end_at': new Date()
                });
            }

            setIsSaved(true);
            alert('Writing saved successfully! You can now close the window.');
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save progress. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isSaved) {
        return (
            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 ml-2">
                <CheckCircle size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">Saved</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleFinish}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="text-xs font-bold uppercase tracking-wider">Save</span>
        </button>
    );
};

const WritingPromptOverlay = () => {
    const activeWritingPrompt = useStore(state => state.activeWritingPrompt);
    const setActiveWritingPrompt = useStore(state => state.setActiveWritingPrompt);

    if (!activeWritingPrompt) return null;

    return (
        <div className="w-full bg-blue-50/80 backdrop-blur border-b border-blue-100 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shrink-0">
            <Pin size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Writing Prompt</div>
                <div className="text-sm text-gray-700 leading-snug">{activeWritingPrompt}</div>
            </div>
            <button
                onClick={() => setActiveWritingPrompt(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default function Editor() {
    const initialConfig = {
        namespace: 'AdaptiveWriter',
        theme,
        onError,
        nodes: [
            TextNode
        ]
    };

    const systemMode = useStore(state => state.systemMode);

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="relative h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
                {systemMode !== 's2' && <IdeaSparkPlugin />}
                {systemMode !== 's1' && <StruggleNudge />}
                <GoalHeader />
                <WritingPromptOverlay />
                <div className="relative flex-1 min-h-0 flex flex-col">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable className="flex-1 p-4 outline-none overflow-y-auto text-gray-900" />
                        }
                        placeholder={<div className="absolute top-4 left-4 text-gray-400 pointer-events-none">Start writing...</div>}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <HistoryPlugin />
                <AutoFocusPlugin />
                <KeystrokeMonitorPlugin />
                <TextChangePlugin />
                {systemMode !== 's2' && <GhostTextPlugin />}
                <MarkupTriggerPlugin />
                <SelectionMenuPlugin />
                <SystemFeedbackPlugin />
            </div>
        </LexicalComposer>
    );
}
