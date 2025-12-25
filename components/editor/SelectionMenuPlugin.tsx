import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, SELECTION_CHANGE_COMMAND } from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, LayoutList, UserCheck, BookOpen, Palette } from 'lucide-react';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';

const tools = [
    { id: 'S2_LOGIC_AUDITOR', label: 'Logic', icon: Search },
    { id: 'S2_STRUCTURAL_MAPPING', label: 'Structure', icon: LayoutList },
    { id: 'S2_THIRD_PARTY_AUDITOR', label: 'Auditor', icon: UserCheck },
    { id: 'S2_EVIDENCE_SUPPORT', label: 'Evidence', icon: BookOpen },
    { id: 'S2_TONE_REFINEMENT', label: 'Tone', icon: Palette },
];

export default function SelectionMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    const { setSelectedStrategy, setPendingPayload, triggerIntervention } = useStore();

    const updateMenu = useCallback(() => {
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

                        // Calculate position (centered above selection)
                        setCoords({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 40 // 40px above
                        });
                        return;
                    }
                }
            }
            setCoords(null);
            setSelectedText('');
        });
    }, [editor]);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                updateMenu();
            });
        });
    }, [editor, updateMenu]);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                updateMenu();
                return false;
            },
            1
        );
    }, [editor, updateMenu]);

    const handleToolClick = (toolId: any, label: string) => {
        console.log(`Selection Tool Clicked: ${label}`);

        // 1. Set Strategy
        setSelectedStrategy(toolId);

        // 2. Prepare Payload with SELECTED TEXT as context
        const payload = monitorAgent.manual_trigger(`Selection Review: ${label}`);
        // Override writing_context with selected text for focused analysis
        payload.writing_context = selectedText;

        setPendingPayload(payload);

        // 3. Trigger
        triggerIntervention();

        // 4. Clear selection/menu (optional, but good UX)
        setCoords(null);
    };

    if (!coords) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 flex items-center gap-1 p-1 bg-gray-900 rounded-lg shadow-lg border border-gray-700 animate-in fade-in zoom-in duration-200"
            style={{
                top: `${coords.y}px`,
                left: `${coords.x}px`,
                transform: 'translateX(-50%)'
            }}
        >
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id, tool.label)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors relative group"
                    title={tool.label}
                >
                    <tool.icon className="w-4 h-4" />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                        {tool.label}
                    </div>
                </button>
            ))}

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>,
        document.body
    );
}
