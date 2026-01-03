import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import { Search, X, LayoutList, Palette } from 'lucide-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';

export const StruggleNudge = () => {
    if (typeof window === 'undefined') return null;

    const [editor] = useLexicalComposerContext();
    const isStruggleDetected = useStore(state => state.isStruggleDetected);
    const setStruggleDetected = useStore(state => state.setStruggleDetected);
    const triggerIntervention = useStore(state => state.triggerIntervention);
    const interventionStatus = useStore(state => state.interventionStatus);
    const struggleDiagnosis = useStore(state => state.struggleDiagnosis);
    const setStruggleDiagnosis = useStore(state => state.setStruggleDiagnosis);
    const setInterventionStatus = useStore(state => state.setInterventionStatus);
    const acceptStruggleDiagnosis = useStore(state => state.acceptStruggleDiagnosis);
    const selectedStrategy = useStore(state => state.selectedStrategy);

    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    // Unified positioning logic
    const updatePosition = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const domSelection = window.getSelection();
                if (domSelection && domSelection.rangeCount > 0) {
                    const range = domSelection.getRangeAt(0);
                    let rect = range.getBoundingClientRect();

                    // Handle collapsed selection (cursor only)
                    if (rect.width === 0 && rect.height === 0) {
                        const rects = range.getClientRects();
                        if (rects.length > 0) {
                            rect = rects[0];
                        }
                    }

                    if (rect && (rect.top !== 0 || rect.left !== 0)) {
                        // Use fixed positioning (viewport relative)
                        // Place it below the cursor
                        setPosition({
                            top: rect.bottom + 10,
                            left: rect.left
                        });
                    }
                }
            }
        });
    }, [editor]);

    // Determine UI visibility
    const isDiagnosing = interventionStatus === 'requesting' && selectedStrategy === 'S2_DIAGNOSIS';
    const hasResult = !!struggleDiagnosis;
    const showResultUI = isDiagnosing || hasResult;
    const showNudgeUI = isStruggleDetected && !showResultUI;
    const isVisible = showNudgeUI || showResultUI;

    useEffect(() => {
        // Update position if any UI is active
        if (isVisible) {
            // Force initial position update
            updatePosition();

            // Also set a fallback timeout in case read() is slow
            const timer = setTimeout(() => updatePosition(), 100);

            // Listen for editor updates
            const unregisterUpdate = editor.registerUpdateListener(() => {
                updatePosition();
            });

            // Listen for scrolling
            const handleScroll = () => updatePosition();
            window.addEventListener('scroll', handleScroll, true);

            return () => {
                clearTimeout(timer);
                unregisterUpdate();
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isVisible, updatePosition, editor]);

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

    // Fallback position if selection is missing
    const finalPosition = position || {
        top: (typeof window !== 'undefined' ? window.innerHeight / 2 - 100 : 0),
        left: (typeof window !== 'undefined' ? window.innerWidth / 2 - 130 : 0)
    };

    // Return null if nothing to show
    if (!showNudgeUI && !showResultUI) {
        return null;
    }

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: finalPosition.top,
                left: finalPosition.left,
                zIndex: 9999
            }}
            className="flex flex-col w-[260px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
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
            </div>

            <div className="p-4">
                {/* 1. Nudge UI (Initial Alert) */}
                {showNudgeUI && (
                    <>
                        <div className="text-sm text-gray-200 font-medium mb-1">도움이 필요하신가요?</div>
                        <div className="text-xs text-gray-500 mb-4 leading-relaxed">
                            AI가 현재 문맥을 분석하여<br />문제점을 진단해 드립니다.
                        </div>
                        <button
                            onClick={() => {
                                editor.getEditorState().read(() => {
                                    const root = editor.getRootElement();
                                    const fullText = root?.innerText || '';

                                    // Get Focal Segment (Current Paragraph or Selection)
                                    const selection = $getSelection();
                                    let focalSegment = '';

                                    if ($isRangeSelection(selection)) {
                                        focalSegment = selection.getTextContent();
                                        // If selection is empty (collapsed), get the current paragraph
                                        if (!focalSegment) {
                                            const anchorNode = selection.anchor.getNode();
                                            const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
                                            focalSegment = element.getTextContent();
                                        }
                                    }

                                    triggerIntervention('S2_DIAGNOSIS', false, undefined, undefined, {
                                        focalSegment,
                                        fullText
                                    });
                                });
                            }}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            <Search size={12} />
                            글 진단 받기
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

                {/* 3. Result UI (Show Diagnosis) */}
                {hasResult && !isDiagnosing && (
                    <div className="space-y-2">
                        <div className="text-xs text-gray-400 mb-2 italic">"이런 부분에서 어려움을 겪고 계신가요?"</div>
                        {[
                            { id: 'logic', label: '논리 (Logic)', icon: Search, color: 'text-blue-400', content: struggleDiagnosis.logic },
                            { id: 'structure', label: '구조 (Structure)', icon: LayoutList, color: 'text-green-400', content: struggleDiagnosis.structure },
                            { id: 'tone', label: '표현 (Tone)', icon: Palette, color: 'text-purple-400', content: struggleDiagnosis.tone }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => acceptStruggleDiagnosis(item.id as any)}
                                className="w-full text-left p-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <item.icon size={13} className={item.color} />
                                    <span className="text-xs font-bold text-gray-200">{item.label}</span>
                                </div>
                                <div className="text-[11px] text-gray-400 leading-snug group-hover:text-gray-300">
                                    {item.content}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
