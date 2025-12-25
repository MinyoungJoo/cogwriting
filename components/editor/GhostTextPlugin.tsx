'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, TextNode, $createParagraphNode, $createTextNode, COMMAND_PRIORITY_LOW, KEY_TAB_COMMAND, KEY_ARROW_RIGHT_COMMAND, $getNodeByKey, $isTextNode, KEY_DOWN_COMMAND, COMMAND_PRIORITY_NORMAL } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';

export default function GhostTextPlugin() {
    const [editor] = useLexicalComposerContext();
    const { ghostText, setGhostText, ghostTextPosition } = useStore();
    const ghostNodeKey = useRef<string | null>(null);

    // Helper to safely remove node without breaking selection
    const safelyRemoveNode = (node: TextNode | null | undefined) => {
        if (!node || !node.isAttached()) return;

        if (node.isSelected()) {
            const prev = node.getPreviousSibling();
            if (prev && $isTextNode(prev)) {
                prev.selectEnd();
            } else {
                const next = node.getNextSibling();
                if (next && $isTextNode(next)) {
                    next.selectStart();
                } else {
                    const parent = node.getParent();
                    if (parent) {
                        parent.selectEnd();
                    }
                }
            }
        }
        node.remove();
    };

    // 1. Listen for new suggestions (Ghost Text)
    useEffect(() => {
        if (ghostText) {
            editor.update(() => {
                // Remove existing ghost node if any
                if (ghostNodeKey.current) {
                    const node = $getNodeByKey(ghostNodeKey.current);
                    if ($isTextNode(node)) {
                        safelyRemoveNode(node);
                    }
                    ghostNodeKey.current = null;
                }

                // Determine insertion point
                let selection = $getSelection();
                let targetNode: TextNode | null = null;
                let targetOffset = 0;

                if (ghostTextPosition) {
                    // Use custom position (for Markup)
                    const node = $getNodeByKey(ghostTextPosition.key);
                    if (node && $isTextNode(node)) {
                        targetNode = node;
                        targetOffset = ghostTextPosition.offset;
                    }
                } else if ($isRangeSelection(selection)) {
                    // Use current selection (for Flow)
                    const anchor = selection.anchor;
                    const node = $getNodeByKey(anchor.key);
                    if (node && $isTextNode(node)) {
                        targetNode = node;
                        targetOffset = anchor.offset;
                    }
                }

                if (targetNode) {
                    const ghostNode = $createTextNode(ghostText);
                    ghostNode.setStyle('color: #9ca3af; pointer-events: none;'); // Gray-400

                    if (ghostTextPosition) {
                        const splitNodes = targetNode.splitText(targetOffset);
                        const beforeNode = splitNodes[0];
                        beforeNode.insertAfter(ghostNode);
                    } else {
                        // Normal append at selection
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertNodes([ghostNode]);
                        }
                    }

                    ghostNodeKey.current = ghostNode.getKey();
                }
            });
        }
    }, [ghostText, editor, ghostTextPosition]);

    // 2. Handle Key Events (Tab to accept, others to dismiss)
    useEffect(() => {
        return editor.registerCommand(
            KEY_DOWN_COMMAND,
            (event: KeyboardEvent) => {
                // Tab to Accept
                if (event.key === 'Tab' && ghostText) {
                    event.preventDefault();
                    editor.update(() => {
                        // 1. Remove the visual ghost node first
                        if (ghostNodeKey.current) {
                            const node = $getNodeByKey(ghostNodeKey.current);
                            if ($isTextNode(node)) {
                                safelyRemoveNode(node);
                            }
                            ghostNodeKey.current = null;
                        }

                        // 2. Handle Replacement (for Markup triggers)
                        const { ghostTextReplacementLength, setGhostTextReplacementLength } = useStore.getState();

                        // Force a normalization/merge of text nodes to ensure we have a single node to operate on
                        const selection = $getSelection();

                        if ($isRangeSelection(selection)) {
                            let anchor = selection.anchor;
                            let node = anchor.getNode();
                            let offset = anchor.offset;

                            // Attempt to merge with previous sibling if it was split by the ghost node
                            if ($isTextNode(node)) {
                                const prev = node.getPreviousSibling();
                                if ($isTextNode(prev)) {
                                    const prevLength = prev.getTextContentSize();
                                    // Merge current node into previous node
                                    // prev becomes the merged node
                                    if (prev.isAttached() && node.isAttached() && prev.getNextSibling()?.getKey() === node.getKey()) {
                                        const mergedNode = prev.mergeWithSibling(node);

                                        // Update our reference to the merged node (which is returned by mergeWithSibling, usually prev)
                                        // And calculate new offset
                                        node = mergedNode;
                                        offset = prevLength + offset;

                                        // Update selection to point to the merged node
                                        // This is important for subsequent operations
                                        if (selection) {
                                            selection.setTextNodeRange(node, offset, node, offset);
                                        }
                                    }
                                }
                            }

                            if ($isTextNode(node)) {
                                // Now safe to splice?
                                if (offset >= ghostTextReplacementLength) {
                                    // Atomic replacement: Delete markup AND insert ghost text in one go
                                    node.spliceText(
                                        offset - ghostTextReplacementLength,
                                        ghostTextReplacementLength,
                                        ghostText,
                                        true
                                    );
                                } else {
                                    console.warn('Cannot replace markup: offset too small', offset, ghostTextReplacementLength);
                                    // Fallback: just insert
                                    selection.insertText(ghostText);
                                }
                            }

                            setGhostTextReplacementLength(0);
                        } else {
                            // 3. Insert the actual text (Flow case, no replacement)
                            if (selection) {
                                selection.insertText(ghostText);
                            }
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

                    // Pattern Breaker: Alt + ArrowRight
                    if (event.altKey && event.key === 'ArrowRight') {
                        event.preventDefault();
                        console.log('Pattern Breaker Triggered');

                        // Trigger S3_PATTERN_BREAKER
                        const { triggerIntervention, setPendingPayload, setSelectedStrategy } = useStore.getState();
                        const payload = monitorAgent.manual_trigger(`Alternative for: ${ghostText}`);

                        setPendingPayload(payload);
                        setSelectedStrategy('S1_PATTERN_BREAKER');
                        triggerIntervention();
                        return true;
                    }

                    editor.update(() => {
                        if (ghostNodeKey.current) {
                            const node = $getNodeByKey(ghostNodeKey.current);
                            if ($isTextNode(node)) {
                                safelyRemoveNode(node);
                            }
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
                    if ($isTextNode(node)) {
                        safelyRemoveNode(node);
                    }
                });
            }
        };
    }, [editor]);

    return null;
}
