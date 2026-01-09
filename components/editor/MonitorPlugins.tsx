'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_NORMAL, KEY_DOWN_COMMAND, TextNode } from 'lexical';
import { monitorAgent } from '@/src/lib/MonitorAgent';
import useStore from '@/store/useStore';

export function KeystrokeMonitorPlugin() {
    const [editor] = useLexicalComposerContext();
    const addKeystroke = useStore((state) => state.addKeystroke);


    // Idle Polling (checking every 1 second)
    useEffect(() => {
        const interval = setInterval(() => {
            if (useStore.getState().isGoalSet) {
                useStore.getState().updateMetrics();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const removeKeyDown = editor.registerCommand(
            KEY_DOWN_COMMAND,
            (event: KeyboardEvent) => {
                // Ignore if goal is not set
                if (!useStore.getState().isGoalSet) {
                    return false;
                }

                // Ignore IME composition events in keydown to avoid "Process" spam
                // keyCode 229 is a standard indicator for IME composition
                if (event.isComposing || event.key === 'Process' || event.keyCode === 229) {
                    return false;
                }

                const now = Date.now() / 1000;
                addKeystroke({
                    key: event.key,
                    timestamp: now,
                    action: 'keydown'
                });
                monitorAgent.on_input_event(event.key);
                useStore.getState().updateMetrics();
                return false;
            },
            COMMAND_PRIORITY_NORMAL
        );

        // Handle IME Composition End (for Korean/CJK)
        const onCompositionEnd = (event: CompositionEvent) => {
            if (!useStore.getState().isGoalSet) return;

            const now = Date.now() / 1000;
            // Log the composed text (e.g., "한")
            addKeystroke({
                key: event.data,
                timestamp: now,
                action: 'compositionend' // distinct action type
            });
            monitorAgent.on_input_event(event.data);
        };

        // We need to attach this to the root element
        const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
            if (prevRootElement) {
                prevRootElement.removeEventListener('compositionend', onCompositionEnd as any);
            }
            if (rootElement) {
                rootElement.addEventListener('compositionend', onCompositionEnd as any);
            }
        });

        return () => {
            removeKeyDown();
            removeRootListener();
        };
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

                // Check Goal Set before updating monitor
                if (useStore.getState().isGoalSet) {
                    monitorAgent.update_content(textContent, cursorIndex);
                }
            });
        });
    }, [editor, setContent]);

    return null;
}
