'use client';

import React, { useState } from 'react';
import { Lock, X, ArrowRight } from 'lucide-react';

interface AdminLoginModalProps {
    onClose: () => void;
    onLogin: () => void;
}

const AdminLoginModal = ({ onClose, onLogin }: AdminLoginModalProps) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'cogwriting') {
            onLogin();
            onClose();
        } else {
            setError('Incorrect password');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-6 pt-8 text-center space-y-6">
                    <div className="mx-auto w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                        <Lock size={20} className="text-blue-400" />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Admin Access</h2>
                        <p className="text-xs text-gray-500">Enter password to view records</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                placeholder="Required Password"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                                autoFocus
                            />
                            {error && <div className="text-xs text-red-500 mt-2 font-medium animate-pulse">{error}</div>}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Access Dashboard</span>
                            <ArrowRight size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginModal;
