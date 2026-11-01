'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Spotlight = { username: string; displayName: string; credential: string | null; answersLast30Days: number };

export function ExpertSpotlight() {
  const [pick, setPick] = useState<Spotlight | null>(null);

  useEffect(() => {
    apiFetch<{ data: Spotlight | null }>('/api/v1/users/spotlight')
      .then((r) => setPick(r.data))
      .catch(() => setPick(null));
  }, []);

  if (!pick) return null;

  return (
    <section className="mx-auto mt-6 max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Expert of the week</p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/profile/${pick.username}`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)]">
            {pick.displayName}
          </Link>
          {pick.credential && <p className="truncate text-sm text-[var(--text-secondary)]">{pick.credential}</p>}
          <p className="text-xs text-[var(--text-muted)]">{pick.answersLast30Days} answers in the last 30 days</p>
        </div>
        <Link href={`/profile/${pick.username}`} className="shrink-0 text-sm text-[var(--primary)] hover:underline">View profile →</Link>
      </div>
    </section>
  );
}
