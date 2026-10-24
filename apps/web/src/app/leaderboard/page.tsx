'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ReputationBadge } from '@/components/reputation-badge';

type Row = { id: string; username: string; displayName: string; reputationScore: number; badges: { badge: { id: string; name: string } }[] };
type Period = 'all' | 'month' | 'week';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' },
];

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    setLoading(true);
    apiFetch<{ data: Row[] }>(`/api/v1/reputation/leaderboard?limit=50&period=${period}`)
      .then((r) => setRows(r.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period]);

  const medal = ['🥇', '🥈', '🥉'];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Top contributors</h1>
          <h2 className="text-sm font-normal text-[var(--text-secondary)]">Reputation is earned through helpful answers, accepted answers and upvotes.</h2>
        </div>
        {/* Period filter */}
        <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                period === p.id ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">No contributors yet.</div>
      ) : (
        <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {rows.map((u, i) => (
            <li key={u.id} className="flex items-center gap-4 p-4">
              <span className="w-8 text-center text-lg tabular-nums text-[var(--text-muted)]">{medal[i] ?? i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/profile/${u.username}`} className="font-medium text-[var(--text)] hover:underline">{u.displayName}</Link>
                  <ReputationBadge score={u.reputationScore} size="sm" />
                </div>
                <p className="text-xs text-[var(--text-muted)]">@{u.username}</p>
                {u.badges.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.badges.slice(0, 4).map((b) => (
                      <span key={b.badge.id} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-600 dark:text-amber-300">{b.badge.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="font-semibold tabular-nums text-[var(--text)]">{u.reputationScore.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
