'use client';

import Link from 'next/link';
import { ArrowRight, Layout, Monitor, PenTool, BookOpen, Database, BarChart, Link as LinkIcon, User } from 'lucide-react';
import useStore from '@/store/useStore';
import { Suspense, useEffect, useState } from 'react'; // [FIX] Added import
import { useSearchParams } from 'next/navigation';
import SessionList from '@/components/dashboard/SessionList';
import LogViewer from '@/components/dashboard/LogViewer';
import PilotLinkGenerator from '@/components/dashboard/PilotLinkGenerator';
import { TOPICS } from '@/src/lib/topics';

function HomeContent() {
  const { writingGenre, setWritingGenre, participantId, setParticipantId } = useStore();
  const searchParams = useSearchParams();

  const [showDashboard, setShowDashboard] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  // isAdmin is now true if they logged in with password.
  // If they came via URL (?pid=...), they bypass login but isAdmin remains false.
  const [isAdmin, setIsAdmin] = useState(false);

  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [pidInput, setPidInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Initial check for PID in URL
  useEffect(() => {
    const urlPid = searchParams.get('pid');
    if (urlPid) {
      setParticipantId(urlPid);
      // URL visitors are NOT admins by default
    }
  }, [searchParams, setParticipantId]);

  // Handle manual Login (PID + Password)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!pidInput.trim()) {
      setLoginError('Participant ID is required.');
      return;
    }

    if (passwordInput !== 'cogwriting') {
      setLoginError('Incorrect password.');
      setPasswordInput('');
      return;
    }

    // Success
    setIsAdmin(true);
    setParticipantId(pidInput.trim());
  };

  // Reset topic when genre changes
  useEffect(() => {
    setSelectedTopicId(null);
  }, [writingGenre]);

  if (showDashboard) {
    if (viewSessionId) {
      return (
        <div className="min-h-screen bg-black p-6">
          <LogViewer sessionId={viewSessionId} onBack={() => setViewSessionId(null)} />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-black p-6 flex flex-col items-center">
        <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
            <Database className="text-blue-500" /> Data Dashboard
          </h1>
          <button
            onClick={() => setShowDashboard(false)}
            className="text-gray-400 hover:text-white underline text-sm"
          >
            Back to Experiment
          </button>
        </div>
        <SessionList onSelectSession={setViewSessionId} />
      </div>
    );
  }

  // GATEKEEPER: Participant ID Required (Welcome Screen)
  if (!participantId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
        <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-gray-700 rounded-full">
              <User size={48} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome</h1>
              <p className="text-gray-400">Enter Access Details</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-xs text-gray-500 font-semibold uppercase ml-1">Participant ID</label>
                <input
                  type="text"
                  value={pidInput}
                  onChange={(e) => setPidInput(e.target.value)}
                  placeholder="e.g., P-12345"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  autoFocus
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs text-gray-500 font-semibold uppercase ml-1">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                />
              </div>

              {loginError && <p className="text-xs text-red-400 animate-pulse font-medium">{loginError}</p>}

              <button
                type="submit"
                disabled={!pidInput.trim() || !passwordInput}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
              >
                Login & Start
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
      {showGenerator && <PilotLinkGenerator onClose={() => setShowGenerator(false)} />}

      {/* Top Right Controls - Show Admin Tools only if Authenticated as Admin */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <div className="px-4 py-2 bg-gray-800 rounded-full border border-gray-700 flex items-center gap-2">
          <User size={14} className="text-green-400" />
          <span className="text-sm font-mono text-gray-300">{participantId}</span>
          <button onClick={() => {
            setParticipantId(null);
            setIsAdmin(false); // Log out
            setPasswordInput('');
          }} className="ml-2 text-xs text-red-400 hover:underline">(Logout)</button>
        </div>

        {isAdmin && (
          <>
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-full border border-gray-700/50 hover:border-green-500/30 animate-in fade-in"
            >
              <LinkIcon size={16} />
              <span className="text-sm font-medium">Link Gen</span>
            </button>

            <button
              onClick={() => setShowDashboard(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-full border border-gray-700/50 hover:border-blue-500/30 animate-in fade-in"
            >
              <BarChart size={16} />
              <span className="text-sm font-medium">View Records</span>
            </button>
          </>
        )}
      </div>

      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-blue-400">Cognitive Writer</h1>
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

        {/* 2. Topic Selection (Conditional) */}
        <div className={`space-y-6 transition-all duration-500 ${writingGenre ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none blur-sm'}`}>
          <h2 className="text-2xl font-semibold text-gray-200">2. Select Topic</h2>
          {writingGenre && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TOPICS[writingGenre].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopicId(t.id)}
                  className={`p-6 rounded-xl border transition-all duration-300 flex flex-col items-start gap-2 text-left hover:scale-105 ${selectedTopicId === t.id
                    ? 'bg-blue-900/40 border-blue-400 text-blue-100 shadow-lg shadow-blue-900/20'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800/80'
                    }`}
                >
                  <h3 className="text-lg font-bold">{t.title}</h3>
                  <p className="text-xs opacity-70 line-clamp-2">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Mode Selection (Conditional) */}
        <div className={`space-y-6 transition-all duration-500 ${selectedTopicId ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none blur-sm'}`}>
          <h2 className="text-2xl font-semibold text-gray-200">3. Select Environment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* System 1 Only */}
            <Link
              href={`/editor?mode=s1&genre=${writingGenre}&topic=${selectedTopicId}&pid=${participantId}`}
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
              href={`/editor?mode=s2&genre=${writingGenre}&topic=${selectedTopicId}&pid=${participantId}`}
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
              href={`/editor?mode=hybrid&genre=${writingGenre}&topic=${selectedTopicId}&pid=${participantId}`}
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
              href={`/editor?mode=monitor&genre=${writingGenre}&topic=${selectedTopicId}&pid=${participantId}`}
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

// [FIX] Wrap 'useSearchParams' usage in Suspense
export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
