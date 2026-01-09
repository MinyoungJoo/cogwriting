import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getSelection, $isRangeSelection, $getNodeByKey } from 'lexical';
import useStore from '@/store/useStore';

export default function SystemFeedbackPlugin() {
    const [editor] = useLexicalComposerContext();
    const {
        interventionStatus,
        pendingPayload,
        setInterventionStatus,
        addFeedbackItem,
        focusedFeedbackId,
        feedbackItems,
        triggerIntervention
    } = useStore();

    // 1. Handle "Detected" Status -> Create Feedback Item
    useEffect(() => {
        if (interventionStatus === 'detected' && pendingPayload) {
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                let nodeKey = null;
                let offset = null;

                if ($isRangeSelection(selection)) {
                    nodeKey = selection.anchor.key;
                    offset = selection.anchor.offset;
                }

                // Map Trigger to Strategy ID
                let strategyId = undefined;
                switch (pendingPayload.trigger_reason) {
                    case 'GHOST_TEXT': strategyId = 'S1_GHOST_TEXT'; break;
                    case 'IDEA_SPARK': strategyId = 'S1_IDEA_SPARK'; break;
                    case 'LOGIC_AUDITOR': strategyId = 'S2_LOGIC_AUDITOR'; break;
                    case 'STRUCTURAL_MAPPING': strategyId = 'S2_STRUCTURAL_MAPPING'; break;
                    case 'THIRD_PARTY_AUDITOR': strategyId = 'S2_THIRD_PARTY_AUDITOR'; break;
                    case 'EVIDENCE_SUPPORT': strategyId = 'S2_EVIDENCE_SUPPORT'; break;
                    case 'TONE_REFINEMENT': strategyId = 'S1_TONE_REFINEMENT'; break;
                    case 'TIME_STUCK': strategyId = 'S1_IDEA_SPARK'; break; // Default fallback
                }

                // Add to store
                addFeedbackItem({
                    trigger: pendingPayload.trigger_reason,
                    context: pendingPayload.writing_context,
                    nodeKey: nodeKey,
                    offset: offset,
                    strategyId: strategyId
                });

                // Auto-trigger for IDEA_SPARK_PREFETCH (Silent)
                if (pendingPayload.trigger_reason === 'IDEA_SPARK_PREFETCH') {
                    // Pre-fetch Idea Spark silently (so it's ready by 10s)
                    triggerIntervention({}, 'S1_IDEA_SPARK');
                    // Reset status to idle so subsequent triggers (like real IDEA_SPARK) are not blocked
                    setInterventionStatus('idle');
                } else if (pendingPayload.trigger_reason === 'IDEA_SPARK') {
                    triggerIntervention();
                    // Do NOT reset status here, IdeaSparkPlugin needs 'detected' (or 'requesting') to show UI
                } else {
                    // Reset status for others (logging only)
                    setInterventionStatus('idle');
                }
            });
        }
    }, [interventionStatus, pendingPayload, editor, addFeedbackItem, setInterventionStatus]);

    // 2. Handle Navigation (Focus Feedback Item)
    useEffect(() => {
        if (focusedFeedbackId) {
            const item = feedbackItems.find(i => i.id === focusedFeedbackId);
            if (item && item.nodeKey) {
                editor.update(() => {
                    const node = $getNodeByKey(item.nodeKey!);
                    if (node) {
                        // Scroll to view
                        const element = editor.getElementByKey(item.nodeKey!);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                            // Optional: Select/Highlight
                            // node.select(item.offset, item.offset);

                            // Visual Highlight (Temporary Class)
                            element.classList.add('bg-yellow-900/50');
                            setTimeout(() => {
                                element.classList.remove('bg-yellow-900/50');
                            }, 2000);
                        }
                    }
                });
            }
        }
    }, [focusedFeedbackId, feedbackItems, editor]);

    return null;
}
