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

import { X, Pin } from 'lucide-react';
import useStore from '@/store/useStore';

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

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="relative h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
                <IdeaSparkPlugin />
                <StruggleNudge />
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
                <GhostTextPlugin />
                <MarkupTriggerPlugin />
                <SelectionMenuPlugin />
                <SystemFeedbackPlugin />
            </div>
        </LexicalComposer>
    );
}
