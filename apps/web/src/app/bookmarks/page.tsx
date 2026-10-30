import type { Metadata } from 'next';
import Link from 'next/link';
import { userFetch } from '@/lib/session-api';
import { SavedQuestions, type Collection, type SavedItem } from '@/components/saved-questions';

export const metadata: Metadata = { title: 'Saved — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Bookmark = { createdAt: string; collectionId: string | null; post: SavedItem['post'] & { status: string; deletedAt: string | null } };

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  const filter = collection ? `&collection=${encodeURIComponent(collection)}` : '';
  const [{ data }, { data: collections }] = await Promise.all([
    userFetch<{ data: Bookmark[] }>(`/api/v1/bookmarks?limit=50${filter}`, '/bookmarks'),
    userFetch<{ data: Collection[] }>('/api/v1/bookmarks/collections', '/bookmarks'),
  ]);
  const items: SavedItem[] = data
    .filter((b) => b.post && b.post.status === 'PUBLISHED' && !b.post.deletedAt)
    .map((b) => ({ postId: b.post.id, collectionId: b.collectionId, post: b.post }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Saved questions</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Questions you bookmarked to read later.</p>
      {items.length === 0 && collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">
          Nothing saved yet. Use <b>Save</b> on any question. <Link href="/discover" className="underline">Discover questions →</Link>
        </div>
      ) : (
        <SavedQuestions collections={collections} items={items} active={collection ?? null} />
      )}
    </div>
  );
}
