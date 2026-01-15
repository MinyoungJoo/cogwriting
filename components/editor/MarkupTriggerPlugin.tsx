import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, TextNode, $isTextNode } from 'lexical';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';
import { getStrategy } from '@/src/lib/strategy';

export default function MarkupTriggerPlugin() {
    const [editor] = useLexicalComposerContext();
    const { setPendingPayload, setInterventionStatus, setGhostTextReplacementLength, triggerIntervention } = useStore();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                // S2 Mode Check: Block S1 triggers
                const { ghostText, systemMode, clearHistory } = useStore.getState();
                if (systemMode === 's2') return;

                // Skip if ghost text is already active
                if (ghostText) return;

                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

                const node = selection.anchor.getNode();
                if (!node || !$isTextNode(node)) return;

                const textContent = node.getTextContent();
                const cursorOffset = selection.anchor.offset;
                const textBeforeCursor = textContent.slice(0, cursorOffset);

                // Debug log
                // console.log('Markup Check:', textBeforeCursor);

                // 1. Gap Filling Trigger: ( ) or (  )
                const gapMatch = textBeforeCursor.match(/\(\s*\)$/);
                if (gapMatch) {
                    console.log('Gap Filling Trigger Detected');
                    const strategy = getStrategy('S1_GAP_FILLING');
                    const payload = monitorAgent.manual_trigger('Fill the gap');

                    setPendingPayload(payload);
                    setGhostTextReplacementLength(gapMatch[0].length);

                    // Insert inside ( )
                    useStore.getState().setGhostTextPosition({
                        key: node.getKey(),
                        offset: cursorOffset - 1 // Before ')'
                    });

                    useStore.getState().clearHistory();
                    useStore.getState().setSelectedStrategy('S1_GAP_FILLING');
                    triggerIntervention(undefined, 'S1_GAP_FILLING');
                    return;
                }

                // 2. Paraphrasing Trigger: ( word )
                const refinementMatch = textBeforeCursor.match(/\(\s*([^)]+)\s*\)$/);
                if (refinementMatch) {
                    const fullMatch = refinementMatch[0];
                    const word = refinementMatch[1];
                    // Ensure it's not just whitespace (handled by Gap Filling)
                    if (word.trim().length > 0) {
                        console.log('Paraphrasing Trigger Detected:', word);

                        const strategy = getStrategy('S1_PARAPHRASING');
                        // Use [PARAPHRASE: word] token to keep the word visible in context
                        const payload = monitorAgent.manual_trigger_with_replacement(`Paraphrase: ${word}`, fullMatch.length, `[PARAPHRASE: ${word}]`);

                        setPendingPayload(payload);
                        setGhostTextReplacementLength(fullMatch.length);

                        useStore.getState().setGhostTextPosition({
                            key: node.getKey(),
                            offset: cursorOffset // After ')'
                        });

                        useStore.getState().clearHistory();
                        useStore.getState().setSelectedStrategy('S1_PARAPHRASING');
                        triggerIntervention(undefined, 'S1_PARAPHRASING');
                        return;
                    }
                }

                // 3. Idea Expansion Trigger: { phrase }
                const expansionMatch = textBeforeCursor.match(/\{\s*([^}]+)\s*\}$/);
                if (expansionMatch) {
                    const fullMatch = expansionMatch[0];
                    const phrase = expansionMatch[1];
                    console.log('Idea Expansion Trigger Detected:', phrase);

                    const strategy = getStrategy('S1_IDEA_EXPANSION');
                    // Use [EXPAND: phrase] token to keep the keyword visible in context
                    const payload = monitorAgent.manual_trigger_with_replacement(`Expand idea: ${phrase}`, fullMatch.length, `[EXPAND: ${phrase}]`);

                    setPendingPayload(payload);
                    setGhostTextReplacementLength(fullMatch.length);

                    // Insert inside { }
                    useStore.getState().setGhostTextPosition({
                        key: node.getKey(),
                        offset: cursorOffset - 1 // Before '}'
                    });

                    useStore.getState().clearHistory();
                    useStore.getState().setSelectedStrategy('S1_IDEA_EXPANSION');
                    triggerIntervention(undefined, 'S1_IDEA_EXPANSION');
                    return;
                }

                // 4. Idea Spark Trigger: /?
                const sparkMatch = textBeforeCursor.match(/\/\?\s*$/);
                if (sparkMatch) {
                    console.log('Idea Spark Trigger Detected');

                    // [FIX] Mutual Exclusion & Forced Run logic
                    useStore.getState().setStruggleDetected(false); // Hide Diagnosis if active
                    monitorAgent.resetCooldown('IDEA_SPARK'); // Allow immediate re-trigger
                    useStore.getState().setIdeaSparkDetected(true); // Force enable UI

                    const strategy = getStrategy('S1_IDEA_SPARK');
                    const payload = monitorAgent.manual_trigger('Help me find ideas');

                    // We need to tell the system this is a "Spark" trigger so the UI appears correctly
                    setPendingPayload(payload);
                    setGhostTextReplacementLength(sparkMatch[0].length);

                    // Allow UI to position itself at cursor
                    useStore.getState().setGhostTextPosition({
                        key: node.getKey(),
                        offset: cursorOffset - sparkMatch[0].length // Start of '(!)'
                    });

                    useStore.getState().clearHistory();
                    useStore.getState().setSelectedStrategy('S1_IDEA_SPARK');
                    triggerIntervention();
                    return;
                }
            });
        });
    }, [editor, setPendingPayload, setInterventionStatus, setGhostTextReplacementLength, triggerIntervention]);

    return null;
}
