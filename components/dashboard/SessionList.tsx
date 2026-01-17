import React, { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { Clock, User, FileText, ChevronRight } from 'lucide-react';
import { getTopicById } from '@/src/lib/topics';

// Helper to resolve title
const getTopicTitle = (id: string) => {
    if (!id || id === 'N/A') return 'N/A';
    // Try to lookup
    const topic = getTopicById(id);
    return topic ? topic.title : id;
};

interface Session {
    _id: string;
    participant_id: string;
    meta: {
        topic_id: string;
        audience: string;
        user_goal: string;
        writing_genre?: string;
        writing_group?: string;
    };
    time_metrics: {
        start_at: string;
        end_at?: string;
    };
    createdAt: string;
}

interface SessionListProps {
    onSelectSession: (sessionId: string) => void;
}

export default function SessionList({ onSelectSession }: SessionListProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setLoading(true);
        api.sessions.list(currentPage, 10)
            .then(data => {
                // Determine if data is array (old API) or object (new API)
                if (Array.isArray(data)) {
                    setSessions(data);
                    setTotalPages(1); // Default if API doesn't support pagination yet
                } else {
                    setSessions(data.sessions);
                    setTotalPages(data.totalPages);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [currentPage]);

    if (loading) return <div className="text-gray-400 p-4">Loading sessions...</div>;

    return (
        <div className="w-full max-w-5xl mx-auto bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 bg-gray-900/50">
                <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                    <FileText size={20} className="text-blue-400" />
                    Recorded Sessions
                </h2>
                <p className="text-sm text-gray-500 mt-1">Recent experiment data collected.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800 uppercase font-semibold text-xs text-gray-500">
                        <tr>
                            <th className="px-6 py-4">Participant</th>
                            <th className="px-6 py-4">Goal & Topic</th>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {sessions.map((session) => (
                            <tr
                                key={session._id}
                                className="hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                onClick={() => onSelectSession(session._id)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-gray-600" />
                                        <span className="font-mono text-gray-300">{session.participant_id}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 font-mono">{session._id.slice(-6)}</div>
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate">
                                    <div className="text-gray-200 font-medium truncate" title={session.meta?.user_goal}>{session.meta?.user_goal || 'No Goal'}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                                        <span className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 text-blue-300">
                                            {session.meta?.writing_genre ? session.meta.writing_genre.toUpperCase() : 'N/A'}
                                        </span>
                                        <span className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 text-purple-300">
                                            {session.meta?.writing_group ? session.meta.writing_group.replace('GROUP_', '') : 'N/A'}
                                        </span>
                                        {/* Fixed Topic Display */}
                                        <span className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 font-mono text-xs truncate max-w-[150px] inline-block align-middle" title={session.meta?.topic_id}>
                                            Topic: {getTopicTitle(session.meta?.topic_id || '')}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                        <Clock size={14} className="text-gray-600" />
                                        <span>{session.time_metrics?.start_at ? new Date(session.time_metrics.start_at).toLocaleString() : 'Date Unknown'}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 pl-5">
                                        {session.time_metrics?.end_at ? 'Completed' : 'In Progress'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto text-xs font-semibold">
                                        View Logs <ChevronRight size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sessions.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-600 italic">No sessions found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {/* Pagination Controls */}
            <div className="bg-gray-800/50 p-4 border-t border-gray-800 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Showing <span className="text-gray-300 font-medium">{sessions.length}</span> items
                </div>

                <div className="flex gap-1 items-center">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Prev
                    </button>

                    {/* Render Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        // Simple collapse logic: show first, last, and window around current
                        // But for now, let's just show all if < 10, otherwise just show simple list
                        // Actually user asked for specific page click.
                        (totalPages <= 10 || Math.abs(currentPage - pageNum) <= 2 || pageNum === 1 || pageNum === totalPages) && (
                            <React.Fragment key={pageNum}>
                                {totalPages > 10 && pageNum !== 1 && pageNum === currentPage - 2 && pageNum > 2 && <span className="text-gray-600 px-1">...</span>}
                                <button
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-1 text-xs font-medium border rounded transition-colors ${currentPage === pageNum
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                                {totalPages > 10 && pageNum !== totalPages && pageNum === currentPage + 2 && pageNum < totalPages - 1 && <span className="text-gray-600 px-1">...</span>}
                            </React.Fragment>
                        )
                    ))}

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
