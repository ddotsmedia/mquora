import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { LanguageBadge } from '@/components/language-badge';
import { VoteButtons } from '@/components/vote-buttons';
import { AnswerForm } from '@/components/answer-form';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  seoSlug: string;
  title: string;
  body: string;
  language: string;
  voteScore: number;
  answerCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  deletedAt?: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
  community: {
    id: string;
    slug: string;
    name: string;
  };
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>;
}

interface Answer {
  id: string;
  body: string;
  voteScore: number;
  isAccepted: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seoSlug: string }>;
}): Promise<Metadata> {
  const { seoSlug } = await params;
  try {
    const post = await serverApiFetch<Post>(`/api/v1/posts/${seoSlug}`);
    return {
      title: `${post.title} — mquora`,
      description: post.body.substring(0, 160),
      openGraph: {
        title: post.title,
        description: post.body.substring(0, 160),
        type: 'article',
      },
    };
  } catch {
    return { title: 'Post not found' };
  }
}

export default async function PostPage({ params }: { params: Promise<{ seoSlug: string }> }) {
  const { seoSlug } = await params;
  let post: Post | null = null;
  let answers: Answer[] = [];

  try {
    post = await serverApiFetch<Post>(`/api/v1/posts/${seoSlug}`);
    const response = await serverApiFetch<{ data: Answer[]; nextCursor: string | null }>(
      `/api/v1/posts/${post.id}/answers`,
    );
    answers = response.data;
  } catch (error) {
    console.error('Failed to fetch post:', error);
    notFound();
  }

  if (!post || post.deletedAt) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <article className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <LanguageBadge language={post.language} />
          <span className="text-sm text-muted-foreground">{post.viewCount} views</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">{post.author.displayName}</p>
            <p>{formatDistanceToNow(new Date(post.createdAt), {addSuffix: true})}</p>
          </div>
          <span>in</span>
          <a href={`/c/${post.community.slug}`} className="hover:text-accent">
            {post.community.name}
          </a>
        </div>

        <div className="flex gap-4 mb-6">
          <VoteButtons targetId={post.id} targetType="POST" initialScore={post.voteScore} />
        </div>

        <div className="prose dark:prose-invert max-w-none mb-6">
          <p className="text-foreground whitespace-pre-wrap">{post.body}</p>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <a
                key={tag.tag.id}
                href={`/search?q=${encodeURIComponent(tag.tag.name)}`}
                className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm hover:bg-accent hover:text-accent-foreground"
              >
                #{tag.tag.name}
              </a>
            ))}
          </div>
        )}
      </article>

      <div className="border-t border-border p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">{answers.length} Answers</h2>

        <div className="space-y-6 mb-8">
          {answers.map((answer) => (
            <div key={answer.id} className="border border-border rounded-lg p-4">
              {answer.isAccepted && (
                <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-semibold">✓ Accepted Answer</p>
              )}
              <div className="flex gap-4">
                <VoteButtons targetId={answer.id} targetType="ANSWER" initialScore={answer.voteScore} />
                <div className="flex-1">
                  <p className="text-foreground whitespace-pre-wrap">{answer.body}</p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">{answer.author.displayName}</p>
                    <p>{formatDistanceToNow(new Date(answer.createdAt), {addSuffix: true})}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Answer</h3>
          <AnswerForm postId={post.id} />
        </div>
      </div>
    </div>
  );
}
