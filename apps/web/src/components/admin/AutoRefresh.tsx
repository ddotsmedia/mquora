'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

// Re-runs the server component every `seconds` (and on click) without a full reload.
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => start(() => router.refresh()), seconds * 1000);
    return () => clearInterval(t);
  }, [on, seconds, router]);

  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="flex items-center gap-2 text-[var(--text-secondary)]">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Auto-refresh {seconds}s
      </label>
      <button
        onClick={() => start(() => router.refresh())}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-2)]"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} /> Refresh
      </button>
    </div>
  );
}
