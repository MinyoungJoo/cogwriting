'use client';

import useStore from '@/store/useStore';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function UnblockingCards() {
    const { suggestionOptions, selectedStrategy } = useStore();
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (selectedStrategy !== 'S1_GUIDED_EXPLORATION' || !suggestionOptions || suggestionOptions.length === 0) return null;

    return (
        <div className="flex flex-col gap-3 p-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-sm font-semibold text-gray-400 mb-1">Unblock Ideas</h3>
            {suggestionOptions.map((option, idx) => (
                <div
                    key={idx}
                    className="group relative bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-500 transition-all cursor-pointer"
                    onClick={() => handleCopy(option, idx)}
                >
                    <div className="text-sm text-gray-300 leading-relaxed">{option}</div>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedIndex === idx ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
