import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, SELECTION_CHANGE_COMMAND } from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';
import { Scale, UserCheck, MessageCircle, Brain, Layout, Search, LayoutList, BookOpen, Palette, Send } from 'lucide-react';

const S2_TOOLS = [
    { id: 'S2_LOGIC_AUDITOR', label: 'Logic', icon: Search },
    { id: 'S2_STRUCTURAL_MAPPING', label: 'Structure', icon: LayoutList },
    { id: 'S2_THIRD_PARTY_AUDITOR', label: 'Review', icon: UserCheck },
    { id: 'S2_EVIDENCE_SUPPORT', label: 'Evidence', icon: BookOpen },
    { id: 'S2_TONE_REFINEMENT', label: 'Tone', icon: Palette },
];

export default function SelectionMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [activeToolId, setActiveToolId] = useState<string | null>(null);
    const [selectionRects, setSelectionRects] = useState<DOMRect[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const { setSelectedStrategy, setPendingPayload, triggerIntervention, systemMode } = useStore();

    // S2 Tools are the only tools in the menu
    const tools = S2_TOOLS;

    const handleSend = () => {
        // Allow send if input is present OR a tool is selected
        if (!inputValue.trim() && !activeToolId) return;

        console.log(`Request: Tool=${activeToolId}, Input=${inputValue}`);

        // 1. Set Strategy
        const strategy = activeToolId || 'S2_CUSTOM_REQUEST';
        setSelectedStrategy(strategy as any);

        // 2. Prepare Payload
        const prompt = inputValue.trim() || (activeToolId ? `Execute ${activeToolId}` : 'Refine this');

        const payload = monitorAgent.manual_trigger(prompt);
        payload.writing_context = selectedText;

        setPendingPayload(payload);

        // 3. Trigger
        triggerIntervention();

        // 4. Cleanup
        setCoords(null);
        setInputValue('');
        setActiveToolId(null);
        setSelectionRects([]);
    };

    const handleToolClick = (toolId: string) => {
        // Toggle selection
        if (activeToolId === toolId) {
            setActiveToolId(null);
        } else {
            setActiveToolId(toolId);
        }
        // Focus input (handled by autoFocus or ref if needed)
    };

    const updateMenu = useCallback(() => {
        // If System 1 Mode, do not show the selection menu
        if (systemMode === 's1') {
            setCoords(null);
            return;
        }

        // If focus is inside the menu (e.g. input), DO NOT update/clear selection
        if (menuRef.current && menuRef.current.contains(document.activeElement)) {
            return;
        }

        editor.getEditorState().read(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection) && !selection.isCollapsed()) {
                const rawText = selection.getTextContent();
                if (rawText.trim().length > 0) {
                    setSelectedText(rawText);

                    const domSelection = window.getSelection();
                    if (domSelection && domSelection.rangeCount > 0) {
                        const range = domSelection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();
                        const rects = Array.from(range.getClientRects());

                        setSelectionRects(rects);

                        // Calculate position
                        const MENU_HEIGHT = 100; // Estimated height
                        const GAP = 10;
                        let top = rect.top - MENU_HEIGHT - GAP;

                        // If not enough space above, show below
                        if (top < 0) {
                            top = rect.bottom + GAP;
                        } else {
                            // Default to above, but slightly closer
                            top = rect.top - 50;
                        }

                        setCoords({
                            x: rect.left + rect.width / 2,
                            y: top
                        });
                        return;
                    }
                }
            }
            setCoords(null);
            setSelectedText('');
            setActiveToolId(null);
            setInputValue('');
            setSelectionRects([]);
        });
    }, [editor, systemMode]); // Added systemMode dependency

    // Handle Mouse/Key Events for Menu Visibility
    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            // Ignore if clicking inside menu
            if (menuRef.current && menuRef.current.contains(e.target as Node)) return;

            // Short timeout to let selection settle
            setTimeout(updateMenu, 10);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key.startsWith('Arrow') || e.shiftKey) {
                setTimeout(updateMenu, 10);
            }
        };
        const handleMouseDown = (e: MouseEvent) => {
            // Ignore if clicking inside menu
            if (menuRef.current && menuRef.current.contains(e.target as Node)) return;

            setCoords(null); // Hide on start of interaction outside menu
            setSelectionRects([]);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('mousedown', handleMouseDown);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [updateMenu]);

    // Remove old Lexical listeners (useEffect with registerUpdateListener/registerCommand)
    // They are replaced by the DOM listeners above to fix the drag issue.

    if (!coords || systemMode === 's1') return null;

    return createPortal(
        <>
            {/* Visual Selection Overlay */}
            {selectionRects.map((rect, i) => (
                <div
                    key={i}
                    style={{
                        position: 'fixed',
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue-500 with opacity
                        pointerEvents: 'none',
                        zIndex: 40 // Below menu (50) but above text
                    }}
                />
            ))}

            <div
                ref={menuRef}
                className="fixed z-50 flex flex-col gap-2 p-2 bg-gray-900 rounded-lg shadow-lg border border-gray-700 animate-in fade-in zoom-in duration-200"
                style={{
                    top: `${coords.y}px`,
                    left: `${coords.x}px`,
                    transform: 'translateX(-50%)'
                }}
            >
                {/* Tools Row */}
                <div className="flex items-center gap-1">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => handleToolClick(tool.id)}
                            className={`p-2 rounded-md transition-colors relative group ${activeToolId === tool.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                            title={tool.label}
                        >
                            <tool.icon className="w-4 h-4" />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                                {tool.label}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Input Row */}
                <div className="flex items-center gap-2 px-1 pt-1 border-t border-gray-800">
                    <input
                        ref={(el) => {
                            // Auto-focus when tool is selected
                            if (el && activeToolId) {
                                el.focus();
                            }
                        }}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSend();
                            }
                            e.stopPropagation(); // Prevent Lexical from catching Enter
                        }}
                        placeholder={activeToolId ? `Instructions for ${tools.find(t => t.id === activeToolId)?.label}...` : "Select a tool first..."}
                        className={`flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none min-w-[150px] ${!activeToolId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!activeToolId}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() && !activeToolId}
                        className={`transition-colors ${inputValue.trim() || activeToolId
                            ? 'text-blue-500 hover:text-blue-400'
                            : 'text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <Send className="w-3 h-3" />
                    </button>
                </div>

                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
        </>,
        document.body
    );
}
