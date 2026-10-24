export const revalidate = 3600;

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { Tag, Hash } from 'lucide-react';

interface TagData {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  posts: Array<{
    id: string;
    title: string;
    seoSlug: string;
    body: string;
    voteScore: number;
    answerCount: number;
    viewCount: number;
    language: string;
    createdAt: string;
    author: { id: string; username: string; displayName: string };
    community?: { id: string; slug: string; name: string };
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await serverApiFetch<TagData>(`/api/v1/tags/${slug}`)
    .catch(() => null);

  if (!tag) {
    return { title: 'Topic not found — askvyo' };
  }

  const title = `${tag.name} — askvyo`;
  const description = `Browse ${tag.postCount} questions about ${tag.name} on askvyo, the Malayalam Q&A community.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/tags/${slug}`,
    },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: `/tags/${slug}` },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tag = await serverApiFetch<TagData>(`/api/v1/tags/${slug}?limit=30`)
    .catch(() => null);

  if (!tag) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-xl bg-[var(--primary)]/10">
            <Hash className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">{tag.name}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {tag.postCount.toLocaleString()} {tag.postCount === 1 ? 'question' : 'questions'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Link
            href={`/ask?tag=${encodeURIComponent(tag.name)}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary)]/90 transition-colors"
          >
            Ask about {tag.name}
          </Link>
          <Link
            href="/tags"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] transition-colors"
          >
            All topics
          </Link>
        </div>
      </header>

      {/* Questions */}
      {tag.posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <Tag className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)]" />
          <p className="font-medium text-[var(--text)]">No questions yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Be the first to ask about {tag.name}.
          </p>
          <Link
            href={`/ask?tag=${encodeURIComponent(tag.name)}`}
            className="mt-4 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
          >
            Ask a question
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tag.posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}

          {tag.postCount > tag.posts.length && (
            <p className="pt-2 text-center text-sm text-[var(--text-secondary)]">
              Showing {tag.posts.length} of {tag.postCount} questions.{' '}
              <Link href={`/search?q=${encodeURIComponent(tag.name)}`} className="text-[var(--primary)] hover:underline">
                Search for more →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
