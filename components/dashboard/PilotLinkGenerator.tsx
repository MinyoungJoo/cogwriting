import React, { useState, useEffect } from 'react';
import { TOPICS, TopicDef } from '@/src/lib/topics';
import { Copy, Link as LinkIcon, RefreshCw, X } from 'lucide-react';

interface PilotLinkGeneratorProps {
    onClose: () => void;
}

export default function PilotLinkGenerator({ onClose }: PilotLinkGeneratorProps) {
    const [genre, setGenre] = useState<'creative' | 'argumentative'>('argumentative');
    const [topicId, setTopicId] = useState<string>(TOPICS.argumentative[0].id);
    const [mode, setMode] = useState<'hybrid' | 's1' | 's2'>('hybrid');
    const [pid, setPid] = useState('');

    // Auto-generate PID on mount
    useEffect(() => {
        regeneratePid();
    }, []);

    // Update topic selection when genre changes
    useEffect(() => {
        setTopicId(TOPICS[genre][0].id);
    }, [genre]);

    const regeneratePid = async () => {
        let isUnique = false;
        let newPid = '';
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            attempts++;
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            newPid = `P-${randomNum}`;

            try {
                // Check if ID exists
                await fetch(`/api/participants?id=${newPid}`).then(res => {
                    if (res.status === 404) {
                        isUnique = true;
                    }
                });
            } catch (e) {
                // If error (network etc), assume potentially unsafe or just stop
                break;
            }
        }

        if (isUnique) {
            setPid(newPid);
        } else {
            // Fallback just in case
            setPid(`P-${Date.now().toString().slice(-4)}`);
        }
    };

    const generateUrl = () => {
        if (typeof window === 'undefined') return '';
        const baseUrl = window.location.origin;
        // Construct the editor URL
        // Format: /editor?mode=...&pid=...&genre=...&topic=...
        const searchParams = new URLSearchParams();
        searchParams.set('mode', mode);
        searchParams.set('pid', pid);
        searchParams.set('genre', genre);
        searchParams.set('topic', topicId);

        return `${baseUrl}/editor?${searchParams.toString()}`;
    };

    const copyToClipboard = () => {
        const url = generateUrl();
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    const currentTopics = TOPICS[genre];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LinkIcon size={20} className="text-blue-400" />
                        Pilot Link Generator
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Participant ID */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Participant ID
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={pid}
                                onChange={(e) => setPid(e.target.value)}
                                className="bg-black border border-gray-700 rounded-lg px-4 py-2 text-white font-mono flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={regeneratePid}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-700 transition-colors"
                                title="Generate New ID"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Genre */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Genre
                            </label>
                            <select
                                value={genre}
                                onChange={(e) => setGenre(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                            >
                                <option value="argumentative">Argumentative</option>
                                <option value="creative">Creative</option>
                            </select>
                        </div>

                        {/* Mode */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                System Mode
                            </label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                            >
                                <option value="hybrid">Hybrid</option>
                                <option value="s1">System 1 Only</option>
                                <option value="s2">System 2 Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Topic */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Task Topic
                        </label>
                        <select
                            value={topicId}
                            onChange={(e) => setTopicId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none truncate"
                        >
                            {currentTopics.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500 bg-gray-950 p-2 rounded border border-gray-800">
                            {currentTopics.find(t => t.id === topicId)?.prompt}
                        </p>
                    </div>

                    {/* Result */}
                    <div className="pt-4 border-t border-gray-800">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Generated Link
                        </label>
                        <div className="flex gap-2">
                            <div className="bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-blue-400 font-mono text-xs break-all flex-1">
                                {generateUrl()}
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1 min-w-[80px]"
                            >
                                <Copy size={18} />
                                <span className="text-[10px]">Copy</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
