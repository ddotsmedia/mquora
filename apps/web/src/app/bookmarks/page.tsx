import type { Metadata } from 'next';
import Link from 'next/link';
import { userFetch } from '@/lib/session-api';
import { PostCard } from '@/components/post-card';

export const metadata: Metadata = { title: 'Saved — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Post = Parameters<typeof PostCard>[0] & { status: string; deletedAt: string | null };

export default async function BookmarksPage() {
  const { data } = await userFetch<{ data: { createdAt: string; post: Post }[] }>('/api/v1/bookmarks?limit=50', '/bookmarks');
  const posts = data.map((b) => b.post).filter((p) => p && p.status === 'PUBLISHED' && !p.deletedAt);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Saved questions</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Questions you bookmarked to read later.</p>
      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">
          Nothing saved yet. Use <b>Save</b> on any question. <Link href="/discover" className="underline">Discover questions →</Link>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {posts.map((p) => <PostCard key={p.id} {...p} />)}
        </div>
      )}
    </div>
  );
}
