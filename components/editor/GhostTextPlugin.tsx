'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, TextNode, $createParagraphNode, $createTextNode, COMMAND_PRIORITY_LOW, KEY_TAB_COMMAND, KEY_ARROW_RIGHT_COMMAND, $getNodeByKey, $isTextNode, KEY_DOWN_COMMAND, COMMAND_PRIORITY_NORMAL } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import useStore from '@/store/useStore';

export default function GhostTextPlugin() {
    const [editor] = useLexicalComposerContext();
    const { ghostText, setGhostText } = useStore();
    const ghostNodeKey = useRef<string | null>(null);

    // 1. Listen for new suggestions (Ghost Text)
    useEffect(() => {
        if (ghostText) {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    // Remove existing ghost node if any
                    if (ghostNodeKey.current) {
                        const node = $getNodeByKey(ghostNodeKey.current);
                        node?.remove();
                        ghostNodeKey.current = null;
                    }

                    // Insert new ghost text
                    const ghostNode = $createTextNode(ghostText);
                    ghostNode.setStyle('color: #9ca3af; pointer-events: none;'); // Gray-400
                    selection.insertNodes([ghostNode]);
                    ghostNodeKey.current = ghostNode.getKey();
                }
            });
        }
    }, [ghostText, editor]);

    // 2. Handle Key Events (Tab to accept, others to dismiss)
    useEffect(() => {
        return editor.registerCommand(
            KEY_DOWN_COMMAND,
            (event: KeyboardEvent) => {
                // Tab to Accept
                if (event.key === 'Tab' && ghostText) {
                    event.preventDefault();
                    editor.update(() => {
                        if (ghostNodeKey.current) {
                            const node = $getNodeByKey(ghostNodeKey.current);
                            if (node) {
                                node.remove();
                                const selection = $getSelection();
                                if ($isRangeSelection(selection)) {
                                    selection.insertText(ghostText);
                                }
                            }
                            ghostNodeKey.current = null;
                        }
                    });
                    setGhostText(null); // Clear after accept
                    return true;
                }

                // Dismiss on other keys (excluding modifiers)
                if (ghostText &&
                    event.key !== 'Tab' &&
                    event.key !== 'Shift' &&
                    event.key !== 'Control' &&
                    event.key !== 'Alt' &&
                    event.key !== 'Meta') {

                    editor.update(() => {
                        if (ghostNodeKey.current) {
                            const node = $getNodeByKey(ghostNodeKey.current);
                            node?.remove();
                            ghostNodeKey.current = null;
                        }
                    });
                    setGhostText(null);
                }

                return false;
            },
            COMMAND_PRIORITY_NORMAL
        );
    }, [editor, ghostText, setGhostText]);

    // 3. Clean up on unmount
    useEffect(() => {
        return () => {
            if (ghostNodeKey.current) {
                editor.update(() => {
                    const node = $getNodeByKey(ghostNodeKey.current!);
                    node?.remove();
                });
            }
        };
    }, [editor]);

    return null;
}
