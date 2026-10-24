import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverApiFetch, ApiError } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { FollowTopicButton } from '@/components/follow-topic-button';

export const dynamic = 'force-dynamic';

type Post = Parameters<typeof PostCard>[0] & { id: string };
type TagPage = { id: string; name: string; slug: string; postCount: number; posts: Post[] };

async function load(slug: string): Promise<TagPage | null> {
  try {
    return await serverApiFetch<TagPage>(`/api/v1/tags/${encodeURIComponent(slug)}`, undefined, { cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await load(slug).catch(() => null);
  if (!tag) return { title: 'Topic not found' };
  return {
    title: `#${tag.name} questions — askvyo`,
    description: `${tag.postCount} Malayalam questions about ${tag.name}, answered by Kerala and Gulf Malayalis on askvyo.`,
    alternates: { canonical: `/t/${tag.slug}` },
  };
}

export default async function TagDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await load(slug);
  if (!tag) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tags" className="text-sm text-[var(--primary)] hover:underline">← All topics</Link>
      <header className="mb-6 mt-2 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">#{tag.name}</h1>
          <h2 className="text-sm font-normal text-[var(--text-secondary)]">{tag.postCount} question{tag.postCount === 1 ? '' : 's'} about #{tag.name}</h2>
        </div>
        <div className="flex gap-2">
          <FollowTopicButton slug={tag.slug} />
          <Link href="/ask" className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">Ask a question</Link>
        </div>
      </header>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {tag.posts.length ? tag.posts.map((p) => <PostCard key={p.id} {...p} />) : <p className="p-8 text-center text-[var(--text-muted)]">No questions yet.</p>}
      </div>
    </div>
  );
}
