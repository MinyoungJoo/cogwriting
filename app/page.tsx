'use client';

import MonitorPanel from '@/components/monitor/MonitorPanel';
import AssistPanel from '@/components/assist/AssistPanel';
import Editor from '@/components/editor/Editor';
import { useMonitor } from '@/src/hooks/useMonitor';

export default function Home() {
  // Initialize the monitor hook
  useMonitor();

  return (
    <main className="flex h-screen w-full bg-white overflow-hidden">
      <MonitorPanel />
      <div className="flex-1 p-6 bg-gray-100">
        <Editor />
      </div>
      <AssistPanel />
    </main>
  );
}
