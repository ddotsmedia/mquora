import type { Metadata } from 'next';
import Link from 'next/link';
import { userFetch } from '@/lib/session-api';
import { PostCard } from '@/components/post-card';

export const metadata: Metadata = { title: 'Following — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Post = Parameters<typeof PostCard>[0] & { id: string };

export default async function FollowingPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  const feed = await userFetch<{ data: Post[]; nextCursor: string | null; empty: boolean }>(
    `/api/v1/feed/following?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    '/following',
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Following</h1>
        <p className="text-sm text-[var(--text-secondary)]">Questions from people, communities and topics you follow.</p>
      </header>
      {feed.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <p className="mb-4 text-[var(--text-secondary)]">
            {feed.empty ? 'You are not following anything yet.' : 'Nothing new from what you follow.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/onboarding" className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white">Pick your interests</Link>
            <Link href="/communities" className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Browse communities</Link>
            <Link href="/tags" className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Browse topics</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.data.map((p) => <PostCard key={p.id} {...p} />)}
          {feed.nextCursor && (
            <div className="pt-2 text-center">
              <Link href={`/following?cursor=${encodeURIComponent(feed.nextCursor)}`} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm hover:bg-[var(--surface-2)]">
                Older questions →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
