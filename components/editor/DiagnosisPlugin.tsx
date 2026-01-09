import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import { $getSelection, $isRangeSelection } from 'lexical';
import { FileText, X, Check, Brain, Layout, Mic } from 'lucide-react';

export default function DiagnosisPlugin() {
    if (typeof window === 'undefined') return null;

    const [editor] = useLexicalComposerContext();
    const struggleDiagnosis = useStore(state => state.struggleDiagnosis);
    const setStruggleDiagnosis = useStore(state => state.setStruggleDiagnosis);
    const interventionStatus = useStore(state => state.interventionStatus);
    const selectedStrategy = useStore(state => state.selectedStrategy);

    const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Visibility logic
    const isVisible = !!struggleDiagnosis;

    // Positioning logic (Simplified from IdeaSparkPlugin)
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
                        if (rects.length > 0) rect = rects[0];
                    }

                    if (rect && (rect.top !== 0 || rect.left !== 0)) {
                        setCoords({
                            x: rect.left,
                            y: rect.bottom + 10
                        });
                        return;
                    }
                }
            }
            // Fallback if no selection or off-screen (e.g. lost focus)
            // Use last known coords if available, else center
            if (!coords) {
                setCoords({
                    x: window.innerWidth / 2 - 150, // Center horizontally
                    y: window.innerHeight / 2 - 150  // Center vertically
                });
            }
        });
    }, [editor, coords]);

    useEffect(() => {
        if (isVisible) {
            // Try to set initial position
            updatePosition();

            // If focus was lost (button click), we might want to rely on the fallback immediately
            // But let's try to update on scroll/resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible, updatePosition]);

    const handleClose = () => {
        setStruggleDiagnosis(null);
    };

    if (!isVisible || !coords) return null;

    // Safety check for parsing JSON strings if they come in as strings
    // (Though store handles this, UI should be safe)
    const logicScore = struggleDiagnosis.logic.includes('10점') ? 'High' : 'Check';
    // Just displaying the raw text for now as per design

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: coords.y,
                left: coords.x,
                zIndex: 100 // Higher than Spark
            }}
            className="flex flex-col w-[320px] bg-white border border-yellow-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {/* Logic */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <Brain size={12} />
                        <span>Logic & Argument</span>
                    </div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                        {struggleDiagnosis.logic}
                    </div>
                </div>

                {/* Structure */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <Layout size={12} />
                        <span>Structure & Flow</span>
                    </div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                        {struggleDiagnosis.structure}
                    </div>
                </div>

                {/* Tone */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <Mic size={12} />
                        <span>Tone & Voice</span>
                    </div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                        {struggleDiagnosis.tone}
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                    onClick={handleClose}
                    className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-xs font-medium transition-colors"
                >
                    <Check size={12} />
                    <span>Confirm</span>
                </button>
            </div>
        </div>,
        document.body
    );
}
