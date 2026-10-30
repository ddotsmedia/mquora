'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

interface HistoryItem { visitedAt: string; id: string; seoSlug: string; title: string; answerCount: number; voteScore: number }

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: HistoryItem[] }>('/api/v1/posts/me/history', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [token]);

  if (status === 'loading') return null;
  if (!token) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-[var(--text-secondary)]">Sign in to see the questions you have read.</p>
        <button onClick={() => signIn()} className="mt-4 rounded-full bg-[var(--primary)] px-4 py-2 text-sm text-white">Sign in</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Reading history</h1>
      {items === null && <p className="mt-6 text-[var(--text-muted)]">Loading…</p>}
      {items?.length === 0 && <p className="mt-6 text-[var(--text-muted)]">Questions you open will appear here.</p>}
      <ul className="mt-6 divide-y divide-[var(--border)]">
        {items?.map((q) => (
          <li key={q.id} className="py-3">
            <Link href={`/q/${q.seoSlug}`} className="font-medium text-[var(--text)] hover:text-[var(--primary)]">{q.title}</Link>
            <p className="text-xs text-[var(--text-muted)]">{q.answerCount} answers · {q.voteScore} votes · visited {new Date(q.visitedAt).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
