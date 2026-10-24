'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { JoinButton } from '@/components/join-button';

type Community = { id: string; slug: string; name: string; description: string | null; memberCount: number; postCount: number };

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: Community[] }>('/api/v1/trending/communities?limit=100')
      .then((r) => setCommunities(r.data ?? []))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query.trim()
    ? communities.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.slug.toLowerCase().includes(query.toLowerCase()) ||
          (c.description ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : communities;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-malayalam text-3xl font-bold text-[var(--text)]">കൂട്ടായ്മകൾ</h1>
        <h2 className="mt-1 font-normal text-[var(--text-secondary)]">Communities — join the ones you care about to see them in your feed.</h2>
      </header>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
        />
      </div>

      {loading ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <li key={i} className="h-36 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">
          {query ? `No communities matching "${query}"` : 'No communities yet.'}
        </div>
      ) : (
        <>
          {query && (
            <p className="mb-3 text-sm text-[var(--text-muted)]">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"</p>
          )}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <li key={c.id} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <Link href={`/c/${c.slug}`} className="group">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/15 font-bold text-[var(--primary)]">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <h2 className="font-semibold text-[var(--text)] group-hover:underline">{c.name}</h2>
                  <p className="text-xs text-[var(--text-muted)]">/c/{c.slug}</p>
                  {c.description && <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{c.description}</p>}
                </Link>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-xs text-[var(--text-muted)]">
                    {c.memberCount.toLocaleString()} members · {c.postCount.toLocaleString()} posts
                  </span>
                  <JoinButton communityId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
