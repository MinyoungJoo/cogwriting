import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import { $getSelection, $isRangeSelection, $getNodeByKey, $isTextNode } from 'lexical';
import { Lightbulb, X } from 'lucide-react';
import { monitorAgent } from '@/src/lib/MonitorAgent';

export default function IdeaSparkPlugin() {
    if (typeof window === 'undefined') return null;

    const [editor] = useLexicalComposerContext();
    const interventionStatus = useStore(state => state.interventionStatus);
    const setInterventionStatus = useStore(state => state.setInterventionStatus);
    const suggestionOptions = useStore(state => state.suggestionOptions);
    const setSuggestionOptions = useStore(state => state.setSuggestionOptions);
    const triggerIntervention = useStore(state => state.triggerIntervention);
    const isIdeaSparkDetected = useStore(state => state.isIdeaSparkDetected);
    const setIdeaSparkDetected = useStore(state => state.setIdeaSparkDetected);
    const setActiveWritingPrompt = useStore(state => state.setActiveWritingPrompt);
    const activeWritingPrompt = useStore(state => state.activeWritingPrompt);
    const selectedStrategy = useStore(state => state.selectedStrategy);
    const ghostTextPosition = useStore(state => state.ghostTextPosition);
    const ghostTextReplacementLength = useStore(state => state.ghostTextReplacementLength);
    const setGhostTextPosition = useStore(state => state.setGhostTextPosition);
    const setGhostTextReplacementLength = useStore(state => state.setGhostTextReplacementLength);
    const isStruggleDetected = useStore(state => state.isStruggleDetected); // Mutual exclusion check

    const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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
                        // Clamp X to prevent overflow (UI width ~260px)
                        const UI_WIDTH = 280;
                        const UI_HEIGHT = 400; // Max height estimate
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;

                        const left = Math.max(10, Math.min(rect.left, viewportWidth - UI_WIDTH));

                        let top = rect.bottom + 10;
                        // If overflows bottom, flip to above
                        if (top + UI_HEIGHT > viewportHeight) {
                            top = Math.max(10, rect.top - UI_HEIGHT - 10);
                            // If user is seeing result (height varies), we might need dynamic measuring, 
                            // but this estimate covers most cases.
                            // Better: if flipping above, align bottom of modal to top of selection
                            // Since we use 'top' for positioning, we'd need to know exact height.
                            // With unknown height, 'bottom' CSS property is better? 
                            // But we render with top/left.
                            // Let's use a simpler check: if we are in the bottom 40% of screen, maybe push up?
                            // Or just use the rect.top logic.

                            // Alternative: If too close to bottom, align `bottom: window.innerHeight - rect.top + 10`
                            // But our component uses `top`.
                            // For now, let's just shift it up significantly if it's really low.
                        }

                        // Revised Logic:
                        if (top + 300 > viewportHeight) { // Assuming ~300px min height needed
                            // Flip above
                            // Since we don't know exact height, let's position it such that bottom is roughly at rect.top
                            // We'll guess height ~300.
                            top = rect.top - 310;
                        }

                        setCoords({
                            x: left,
                            y: top
                        });
                    }
                }
            }
        });
    }, [editor]);

    // Determine UI visibility
    const isRequesting = interventionStatus === 'requesting' && selectedStrategy === 'S1_IDEA_SPARK';
    const isFailed = interventionStatus === 'failed' && selectedStrategy === 'S1_IDEA_SPARK';
    const hasResult = !!suggestionOptions;
    const showResultUI = isRequesting || hasResult || isFailed;
    // const showNudgeUI = isIdeaSparkDetected && !showResultUI;
    // Force show result UI if triggered manually via markup to skip nudge
    const showNudgeUI = isIdeaSparkDetected && !showResultUI && !ghostTextPosition;

    // If we have a manual trigger (ghostTextPosition set), we might want to skip the nudge and go straight to "Requesting" 
    // BUT, the current logic is:
    // 1. Manual Trigger sets selectedStrategy='S1_IDEA_SPARK' & pendingPayload
    // 2. It calls triggerIntervention() which sets status='requesting'
    // 3. So showResultUI becomes true (isRequesting=true)
    // 4. So showNudgeUI becomes false.
    // This seems correct for skipping the nudge.

    const isVisible = (showNudgeUI || showResultUI);

    // Update position when UI is active and on editor updates
    useEffect(() => {
        if (isVisible) {
            updatePosition();

            // Listen for editor updates
            const unregisterUpdate = editor.registerUpdateListener(() => {
                updatePosition();
            });

            // Listen for scrolling
            const handleScroll = () => updatePosition();
            window.addEventListener('scroll', handleScroll, true);

            return () => {
                unregisterUpdate();
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isVisible, updatePosition, editor]);

    // Fallback position if selection is missing
    const finalCoords = coords || {
        x: (typeof window !== 'undefined' ? window.innerWidth / 2 - 130 : 0),
        y: (typeof window !== 'undefined' ? window.innerHeight / 2 - 100 : 0)
    };

    const handleNudgeClick = () => {
        setIdeaSparkDetected(false); // Hide Nudge
        triggerIntervention(undefined, 'S1_IDEA_SPARK'); // Start API call -> sets interventionStatus to 'requesting'
    };

    const handleClose = () => {
        // Cleanup trigger text if it exists (e.g., /? or empty markup)
        if (ghostTextPosition && ghostTextReplacementLength > 0) {
            editor.update(() => {
                const node = $getNodeByKey(ghostTextPosition.key);
                if (node && $isTextNode(node)) {
                    // Safety check: ensure offset is within bounds
                    if (ghostTextPosition.offset <= node.getTextContent().length) {
                        node.spliceText(ghostTextPosition.offset, ghostTextReplacementLength, '');
                    }
                }
            });
            // Reset Store
            setGhostTextPosition(null);
            setGhostTextReplacementLength(0);
        }

        setIdeaSparkDetected(false);
        setSuggestionOptions(null);
        setInterventionStatus('idle');
        setCoords(null);

        // [FIX] Add cooldown on close to prevent immediate re-trigger
        monitorAgent.extendCooldown('IDEA_SPARK', 60);
    };

    const handleQuestionClick = (question: string) => {
        // Pin the selected question as a writing prompt
        console.log('Selected question:', question);
        setActiveWritingPrompt(question);
        handleClose();
    };

    // [MODIFIED] Log Throttling (10s)
    const lastLogRef = useRef(0);

    if (!isVisible) {
        const now = Date.now();
        if (now - lastLogRef.current > 10000) {
            console.log('[IdeaSpark] Hidden (isIdeaSparkDetected:', isIdeaSparkDetected, ', hasResult:', hasResult, ')');
            lastLogRef.current = now;
        }
        return null;
    }

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: finalCoords.y,
                left: finalCoords.x,
                zIndex: 50
            }}
            className="flex flex-col w-[260px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Lightbulb size={10} className="text-yellow-500" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Idea Spark</span>
                </div>
                <button
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>

            <div className="p-3">
                {/* 1. Nudge UI */}
                {showNudgeUI && (
                    <>
                        <div className="text-sm text-gray-200 font-medium mb-1">
                            아이디어가 필요하신가요?
                        </div>
                        <div className="text-xs text-gray-500 mb-3 leading-relaxed">
                            SCAMPER 기법으로<br />
                            새로운 발상을 도와드립니다.
                        </div>
                        <button
                            onClick={handleNudgeClick}
                            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                        >
                            <Lightbulb size={12} />
                            아이디어 제안 받기
                        </button>
                    </>
                )}

                {/* 2. Loading UI */}
                {isRequesting && (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">답변을 생성중입니다...</span>
                    </div>
                )}

                {/* 3. Error UI */}
                {interventionStatus === 'failed' && selectedStrategy === 'S1_IDEA_SPARK' && (
                    <div className="flex flex-col items-center justify-center py-4 gap-2">
                        <span className="text-xs text-red-400 font-medium">Failed to generate ideas.</span>
                        <button
                            onClick={() => triggerIntervention(undefined, 'S1_IDEA_SPARK')}
                            className="text-[10px] text-gray-400 hover:text-white underline"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* 3. Result UI */}
                {hasResult && !isRequesting && (
                    <div className="space-y-1">
                        {suggestionOptions?.map((q, idx) => {
                            const match = q.match(/^\[(.*?)\]\s*(.*)$/);
                            const strategy = match ? match[1] : null;
                            const text = match ? match[2] : q;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setActiveWritingPrompt(q);
                                        // Extend cooldown for Idea Spark since user accepted help
                                        // monitorAgent.extendCooldown('IDEA_SPARK', 30); (Removed as redundant)
                                        handleClose(); // This will also setIdeaSparkDetected(false)
                                    }}
                                    className="w-full text-left p-2 text-xs text-gray-300 hover:bg-purple-900/30 rounded transition-colors flex items-start gap-2"
                                >
                                    <span className="shrink-0 mt-0.5 text-gray-500">{idx + 1}.</span>
                                    <div className="flex flex-col">
                                        {strategy && (
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                                                {strategy}
                                            </span>
                                        )}
                                        <span className="leading-relaxed">{text}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
