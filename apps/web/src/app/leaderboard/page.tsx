import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Top contributors — askvyo',
  description: 'The most helpful members of the Malayalam knowledge community, ranked by reputation.',
  alternates: { canonical: '/leaderboard' },
};
export const revalidate = 300;

type Row = { id: string; username: string; displayName: string; reputationScore: number; badges: { badge: { id: string; name: string } }[] };

export default async function LeaderboardPage() {
  let rows: Row[] = [];
  try {
    rows = (await serverApiFetch<{ data: Row[] }>('/api/v1/reputation/leaderboard?limit=50')).data;
  } catch (e) {
    console.error('leaderboard load failed', e);
  }
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text)]">Top contributors</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Reputation is earned through helpful answers, accepted answers and upvotes.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">No contributors yet.</div>
      ) : (
        <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {rows.map((u, i) => (
            <li key={u.id} className="flex items-center gap-4 p-4">
              <span className="w-8 text-center text-lg tabular-nums text-[var(--text-muted)]">{medal[i] ?? i + 1}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${u.username}`} className="font-medium text-[var(--text)] hover:underline">{u.displayName}</Link>
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
