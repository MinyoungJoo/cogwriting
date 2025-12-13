'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { TextNode } from 'lexical';
import GhostTextPlugin from './GhostTextPlugin';
import { KeystrokeMonitorPlugin, TextChangePlugin } from './MonitorPlugins';

const theme = {
    paragraph: 'mb-2',
};

function onError(error: Error) {
    console.error(error);
}

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
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable className="flex-1 p-4 outline-none overflow-y-auto text-gray-900" />
                    }
                    placeholder={<div className="absolute top-4 left-4 text-gray-400 pointer-events-none">Start writing...</div>}
                    ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <AutoFocusPlugin />
                <KeystrokeMonitorPlugin />
                <TextChangePlugin />
                <GhostTextPlugin />
            </div>
        </LexicalComposer>
    );
}
