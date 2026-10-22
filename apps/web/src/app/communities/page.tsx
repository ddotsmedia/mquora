import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/api';
import { JoinButton } from '@/components/join-button';

export const metadata: Metadata = {
  title: 'Communities — askvyo',
  description: 'Browse Malayalam communities on askvyo: Kerala, UAE, jobs, education, technology, health and more.',
  alternates: { canonical: '/communities' },
};
export const revalidate = 60;

type Community = { id: string; slug: string; name: string; description: string | null; memberCount: number; postCount: number };

export default async function CommunitiesPage() {
  let communities: Community[] = [];
  try {
    communities = (await serverApiFetch<{ data: Community[] }>('/api/v1/trending/communities?limit=50')).data;
  } catch (e) {
    console.error('Failed to load communities', e);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-malayalam text-3xl font-bold text-[var(--text)]">കൂട്ടായ്മകൾ</h1>
        <p className="mt-1 text-[var(--text-secondary)]">Communities — join the ones you care about to see them in your feed.</p>
      </header>
      {communities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">
          No communities yet.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
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
      )}
    </div>
  );
}
