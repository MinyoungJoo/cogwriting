import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import { Search, X, LayoutList, Palette, Check } from 'lucide-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $isTextNode, $getRoot } from 'lexical';

export const StruggleNudge = () => {
    // if (typeof window === 'undefined') return null; // [FIX] Removed to prevent hydration mismatch

    const [editor] = useLexicalComposerContext();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // [FIX] Force reset transient states on mount to prevent stale data from opening the window
        useStore.getState().setStruggleDetected(false);
        useStore.getState().setStruggleDiagnosis(null);
        useStore.getState().setInterventionStatus('idle');
    }, []);

    const isStruggleDetected = useStore(state => state.isStruggleDetected);
    const setStruggleDetected = useStore(state => state.setStruggleDetected);
    // const isIdeaSparkDetected = useStore(state => state.isIdeaSparkDetected); // [REMOVED] Mutual exclusion check
    const triggerIntervention = useStore(state => state.triggerIntervention);
    const interventionStatus = useStore(state => state.interventionStatus);
    const struggleDiagnosis = useStore(state => state.struggleDiagnosis);
    const setStruggleDiagnosis = useStore(state => state.setStruggleDiagnosis);
    const setInterventionStatus = useStore(state => state.setInterventionStatus);
    const acceptStruggleDiagnosis = useStore(state => state.acceptStruggleDiagnosis);
    const selectedStrategy = useStore(state => state.selectedStrategy);
    const activeWritingPrompt = useStore(state => state.activeWritingPrompt);

    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    // ... (positioning logic unchanged) ...

    const isDiagnosing = interventionStatus === 'requesting' && selectedStrategy === 'S2_DIAGNOSIS';
    const isFailed = interventionStatus === 'failed' && selectedStrategy === 'S2_DIAGNOSIS';
    const hasResult = !!struggleDiagnosis;
    const showResultUI = isDiagnosing || hasResult || isFailed;
    const showNudgeUI = isStruggleDetected && !showResultUI;

    // [CLEANUP] Removed unused isIdeaSparkBlocking logic entirely
    const isVisible = (showNudgeUI || showResultUI);

    // ... (effect logic unchanged) ...
    // ...

    // [MODIFIED] Log Throttling (10s)
    const lastLogRef = React.useRef(0);

    const handleClose = () => {
        setStruggleDetected(false);
        if (setStruggleDiagnosis) setStruggleDiagnosis(null);
        if (setInterventionStatus) setInterventionStatus('idle');

        // Extend cooldown to prevent immediate re-triggering if user dismissed it
        // Give them 60 seconds of peace
        import('@/src/lib/MonitorAgent').then(({ monitorAgent }) => {
            monitorAgent.extendCooldown('STRUGGLE_DETECTION', 60);
        });
    };

    if (!isMounted) return null;
    if (!isVisible) return null; // [FIX] Prevent rendering empty window when idle

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: '10px',
                right: '120px',
                zIndex: 9999 // [REVERTED] Z-Index back to original
            }}
            className="flex flex-col w-[220px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-2.5 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Search size={14} className={showNudgeUI ? "text-amber-500" : "text-blue-500"} />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                        {showNudgeUI ? "Struggle Detected" : "Diagnosis Result"}
                    </span>
                </div>
                <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div >

            <div className="p-3">
                {/* 1. Nudge UI (Initial Alert) */}
                {showNudgeUI && (
                    <>
                        <div className="text-sm text-gray-200 font-medium mb-3 text-center">성찰적 피드백이 필요하신가요?</div>

                        <button
                            onClick={() => {
                                editor.getEditorState().read(() => {
                                    // Get Full Text with Cursor Marker
                                    const root = editor.getRootElement();
                                    const selection = $getSelection();
                                    let contextWithCursor = '';

                                    if ($isRangeSelection(selection)) {
                                        const anchor = selection.anchor;
                                        const anchorNode = anchor.getNode();
                                        const offset = anchor.offset;

                                        // We need to construct text and insert marker
                                        // Simple approach: Get all text, but that loses position match.
                                        // Better: Iterate paragraphs.

                                        // Actually, for Diagnosis, Paragraph-level context with Cursor is usually sufficient and safer to calculate.
                                        // But user asked for "Writing Context" with cursor.

                                        // Let's rely on Lexical's node traversal to build the string + marker.
                                        let textBuilder = '';
                                        const topLevelChildren = editor.getEditorState().read(() => $getRoot().getChildren());

                                        for (const child of topLevelChildren) {
                                            const childText = child.getTextContent();

                                            // Check if cursor is in this child (or its descendants)
                                            const childKey = child.getKey();
                                            const anchorKey = anchorNode.getKey();
                                            const anchorTopLevel = anchorNode.getTopLevelElementOrThrow().getKey();

                                            if (childKey === anchorTopLevel) {
                                                // Cursor is in this block.
                                                // We need to find the insertion point.
                                                // If anchor is TextNode:
                                                if ($isTextNode(anchorNode)) {
                                                    // We need absolute offset relative to this block's text
                                                    let absoluteOffset = offset;
                                                    let sibling = anchorNode.getPreviousSibling();
                                                    while (sibling) {
                                                        absoluteOffset += sibling.getTextContentSize();
                                                        sibling = sibling.getPreviousSibling();
                                                    }

                                                    // Insert Marker
                                                    const markedText = childText.slice(0, absoluteOffset) + ' [CURSOR] ' + childText.slice(absoluteOffset);
                                                    textBuilder += markedText + '\n\n';
                                                } else {
                                                    // Anchor is element (offset is child index).
                                                    // For simplicity, just append to end of this block if ambiguous
                                                    textBuilder += childText + ' [CURSOR]\n\n';
                                                }
                                            } else {
                                                textBuilder += childText + '\n\n';
                                            }
                                        }
                                        contextWithCursor = textBuilder.trim();
                                    } else {
                                        // Fallback if no selection
                                        contextWithCursor = root?.innerText || '';
                                    }

                                    triggerIntervention({
                                        writing_context: contextWithCursor
                                    }, 'S2_DIAGNOSIS');
                                });
                            }}
                            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            <Search size={12} />
                            내 글 진단하기
                        </button>
                    </>
                )}

                {/* 2. Loading UI (Diagnosing) */}
                {isDiagnosing && (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">문맥을 분석하고 있습니다...</span>
                    </div>
                )}

                {/* Error UI */}
                {interventionStatus === 'failed' && selectedStrategy === 'S2_DIAGNOSIS' && (
                    <div className="flex flex-col items-center justify-center py-4 gap-2">
                        <span className="text-xs text-red-400 font-medium">Diagnosis Failed.</span>
                        <button
                            onClick={() => triggerIntervention(undefined, 'S2_DIAGNOSIS')}
                            className="text-[10px] text-gray-400 hover:text-white underline"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* 3. Result UI (Show Diagnosis) */}
                {hasResult && !isDiagnosing && (
                    <StruggleResultList
                        diagnosis={struggleDiagnosis}
                        onConfirm={(selected) => {
                            useStore.getState().acceptMultipleDiagnoses(selected);
                        }}
                    />
                )}
            </div>
        </div >,
        document.body
    );
};

function StruggleResultList({ diagnosis, onConfirm }: { diagnosis: any, onConfirm: (selected: string[]) => void }) {
    const [selected, setSelected] = useState<string[]>([]);
    const { Check } = require('lucide-react'); // Lazy import for icon or just use existing imports

    const toggleSelection = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    const items = [
        { id: 'logic', label: '논리 (Logic)', icon: Search, color: 'text-blue-400', content: diagnosis.logic },
        { id: 'structure', label: '구조 (Structure)', icon: LayoutList, color: 'text-green-400', content: diagnosis.structure },
        { id: 'tone', label: '표현 (Tone)', icon: Palette, color: 'text-purple-400', content: diagnosis.tone }
    ];

    return (
        <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2 italic">"더 확인하고 싶은 항목을 선택하세요"</div>
            {items.map((item) => {
                const isSelected = selected.includes(item.id);
                return (
                    <button
                        key={item.id}
                        onClick={() => toggleSelection(item.id)}
                        className={`w-full text-left p-2.5 border rounded-lg transition-all group ${isSelected
                            ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <item.icon size={13} className={item.color} />
                                <span className={`text-xs font-bold ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>{item.label}</span>
                            </div>
                            {isSelected && <Check size={12} className="text-blue-400" />}
                        </div>
                        <div className={`text-[11px] leading-snug ${isSelected ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'}`}>
                            {item.content}
                        </div>
                    </button>
                );
            })}

            <button
                onClick={() => onConfirm(selected)}
                disabled={selected.length === 0}
                className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
            >
                <Check size={12} />
                선택 항목 확인 ({selected.length})
            </button>
        </div>
    );
}
