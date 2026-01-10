'use client';

import React, { useState } from 'react';
import useStore from '@/store/useStore';
import { monitorAgent } from '@/src/lib/MonitorAgent';
import { api } from '@/src/lib/api';
import { Target, BookOpen, Users, ArrowRight, PenLine } from 'lucide-react';

const GoalSettingModal = () => {
    const {
        writingGenre,
        writingTopic,
        writingPrompt, // [NEW]
        writingAudience,
        setIsGoalSet,
        setUserGoal
    } = useStore();

    const [goalInput, setGoalInput] = useState(useStore.getState().userGoal || '');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!goalInput.trim()) {
            setError('Please define your goal to continue.');
            return;
        }

        const { participantId, setSessionId, writingPrompt, writingAudience } = useStore.getState();

        if (participantId) {
            try {
                const session = await api.sessions.create({
                    participant_id: participantId,
                    meta: {
                        topic_id: writingPrompt || 'N/A',
                        audience: writingAudience || 'General',
                        user_goal: goalInput,
                        writing_genre: writingGenre || 'argumentative', // [FIX] Include Genre
                        writing_group: useStore.getState().systemMode || 'hybrid' // [FIX] Include Mode as Group
                    },
                    time_metrics: {
                        start_at: new Date()
                    }
                });
                console.log('Session created:', session._id);
                setSessionId(session._id);
            } catch (err) {
                console.error('Failed to create session:', err);
            }
        } else {
            console.error('No participant ID found, session not created in DB.');
        }

        setUserGoal(goalInput);
        setIsGoalSet(true);
        // Reset monitor agent to ensure clean start
        monitorAgent.resetSession();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-gray-800/50 p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Target size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Set Your Writing Goal</h2>
                    </div>
                    <p className="text-gray-400 text-sm">
                        Define your specific writing goal to calibrate the AI assistant.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Predefined Contexts (List) */}
                    <div className="space-y-3">
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Context</span>
                            <div className="flex items-center gap-2 text-gray-200">
                                <BookOpen size={14} className="text-blue-400" />
                                <span className="text-sm font-medium capitalize">{writingGenre || 'General'}</span>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Topic</span>
                            <div className="flex items-center gap-2 text-gray-200">
                                <PenLine size={14} className="text-yellow-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-left leading-snug" title={writingPrompt || writingTopic || ''}>{writingPrompt || writingTopic || 'Not set'}</span>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Audience</span>
                            <div className="flex items-center gap-2 text-gray-200">
                                <Users size={14} className="text-purple-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-left leading-snug" title={writingAudience || ''}>{writingAudience || 'General'}</span>
                            </div>
                        </div>
                    </div>

                    {/* User Goal Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Writing Goal
                            <span className="text-xs text-gray-500">Required</span>
                        </label>
                        <textarea
                            value={goalInput}
                            onChange={(e) => {
                                setGoalInput(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="글쓰기의 목표를 간단히 적어주세요."
                            className={`w-full h-32 bg-gray-950 border ${error ? 'border-red-500/50' : 'border-gray-800'} rounded-xl p-4 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all placeholder:text-gray-600`}
                        />
                        {error && <span className="text-xs text-red-400 animate-pulse">{error}</span>}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        Start Writing
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoalSettingModal;
