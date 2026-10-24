import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Topics people ask about — askvyo',
  description: 'Browse every topic people ask about on askvyo.',
  alternates: { canonical: '/tags' },
};
export const dynamic = 'force-dynamic';

type Tag = { id: string; name: string; slug: string; postCount: number };

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const tags = await serverApiFetch<{ data: Tag[] }>(`/api/v1/tags?limit=300${q ? `&q=${encodeURIComponent(q)}` : ''}`, undefined, { cache: 'no-store' })
    .then((r) => r.data)
    .catch(() => [] as Tag[]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Topics</h1>
          <h2 className="text-sm font-normal text-[var(--text-secondary)]">Every tag used on questions, most popular first.</h2>
        </div>
        <form action="/tags" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Find a topic…"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]" />
          <button className="rounded-lg bg-[var(--primary)] px-3 text-sm text-white">Search</button>
        </form>
      </header>
      {tags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">
          {q ? `No topics match “${q}”.` : 'No topics yet.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tags.map((t) => (
            <li key={t.id}>
              <Link href={`/t/${t.slug}`} className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)]">
                <span className="font-medium text-[var(--text)]">#{t.name}</span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">{t.postCount} question{t.postCount === 1 ? '' : 's'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
