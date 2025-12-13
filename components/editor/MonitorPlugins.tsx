'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_NORMAL, KEY_DOWN_COMMAND, TextNode } from 'lexical';
import { monitorAgent } from '@/src/lib/MonitorAgent';
import useStore from '@/store/useStore';

export function KeystrokeMonitorPlugin() {
    const [editor] = useLexicalComposerContext();
    const addKeystroke = useStore((state) => state.addKeystroke);

    useEffect(() => {
        return editor.registerCommand(
            KEY_DOWN_COMMAND,
            (event: KeyboardEvent) => {
                const now = Date.now() / 1000;

                // 1. Update Store (Legacy/Visual)
                addKeystroke({
                    key: event.key,
                    timestamp: now,
                    action: 'keydown'
                });

                // 2. Feed Monitor Agent (Logic)
                monitorAgent.on_input_event(event.key);

                return false;
            },
            COMMAND_PRIORITY_NORMAL
        );
    }, [editor, addKeystroke]);

    return null;
}

export function TextChangePlugin() {
    const [editor] = useLexicalComposerContext();
    const setContent = useStore((state) => state.setContent);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const textContent = editor.getRootElement()?.innerText || '';

                // 1. Update Store
                setContent(textContent);

                // 2. Feed Monitor Agent
                // We need cursor position too.
                const selection = window.getSelection();
                const cursorIndex = selection?.anchorOffset || 0; // Simplified cursor

                monitorAgent.update_content(textContent, cursorIndex);
            });
        });
    }, [editor, setContent]);

    return null;
}
