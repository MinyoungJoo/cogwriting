'use client';

import Link from 'next/link';
import { ArrowRight, Layout, Monitor, PenTool, BookOpen } from 'lucide-react';
import useStore from '@/store/useStore';
import { useEffect } from 'react';

export default function LandingPage() {
  const { writingGenre, setWritingGenre } = useStore();

  // Reset genre on mount (optional, or keep it persistent)
  // useEffect(() => { setWritingGenre(null); }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-blue-400">Adaptive Writer</h1>
          <p className="text-gray-400 text-xl">Choose your writing context</p>
        </div>

        {/* 1. Genre Selection */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-200">1. Select Genre</h2>
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setWritingGenre('creative')}
              className={`p-6 rounded-xl border-2 transition-all duration-300 w-64 flex flex-col items-center gap-3 ${writingGenre === 'creative'
                ? 'bg-blue-900/40 border-blue-400 text-blue-100 scale-105 shadow-lg shadow-blue-900/20'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800/80'
                }`}
            >
              <PenTool size={32} />
              <span className="text-lg font-bold">Creative</span>
              <span className="text-xs opacity-70">Storytelling, Novels, Essays</span>
            </button>

            <button
              onClick={() => setWritingGenre('argumentative')}
              className={`p-6 rounded-xl border-2 transition-all duration-300 w-64 flex flex-col items-center gap-3 ${writingGenre === 'argumentative'
                ? 'bg-purple-900/40 border-purple-400 text-purple-100 scale-105 shadow-lg shadow-purple-900/20'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800/80'
                }`}
            >
              <BookOpen size={32} />
              <span className="text-lg font-bold">Argumentative</span>
              <span className="text-xs opacity-70">Papers, Reports, Editorials</span>
            </button>
          </div>
        </div>

        {/* 2. Mode Selection (Conditional) */}
        <div className={`space-y-6 transition-all duration-500 ${writingGenre ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none blur-sm'}`}>
          <h2 className="text-2xl font-semibold text-gray-200">2. Select Environment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* System 1 Only */}
            <Link
              href="/editor?mode=s1"
              className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-green-500 hover:bg-gray-800/80 transition-all duration-300 flex flex-col items-center text-center space-y-3"
            >
              <div className="p-3 bg-gray-700 rounded-full group-hover:bg-green-500/20 group-hover:text-green-400 transition-colors">
                <span className="text-xl font-bold">S1</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">System 1 Only</h3>
                <p className="text-xs text-gray-400">Pure flow. No distractions.</p>
              </div>
            </Link>

            {/* System 2 Only */}
            <Link
              href="/editor?mode=s2"
              className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-orange-500 hover:bg-gray-800/80 transition-all duration-300 flex flex-col items-center text-center space-y-3"
            >
              <div className="p-3 bg-gray-700 rounded-full group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                <span className="text-xl font-bold">S2</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">System 2 Only</h3>
                <p className="text-xs text-gray-400">Deep analysis & Chat.</p>
              </div>
            </Link>

            {/* Hybrid Mode */}
            <Link
              href="/editor?mode=hybrid"
              className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-gray-800/80 transition-all duration-300 flex flex-col items-center text-center space-y-3"
            >
              <div className="p-3 bg-gray-700 rounded-full group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                <Layout size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Hybrid</h3>
                <p className="text-xs text-gray-400">S1 + S2 Integration.</p>
              </div>
            </Link>

            {/* Hybrid + Monitor */}
            <Link
              href="/editor?mode=monitor"
              className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800/80 transition-all duration-300 flex flex-col items-center text-center space-y-3"
            >
              <div className="p-3 bg-gray-700 rounded-full group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                <Monitor size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Hybrid + Monitor</h3>
                <p className="text-xs text-gray-400">Full visibility & metrics.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
