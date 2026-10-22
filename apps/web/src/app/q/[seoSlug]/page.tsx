import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { LanguageBadge } from '@/components/language-badge';
import { VoteButtons } from '@/components/vote-buttons';
import { BookmarkButton } from '@/components/bookmark-button';
import { AnswerForm } from '@/components/answer-form';
import { Comments } from '@/components/comments';
import { ReportButton } from '@/components/report-button';
import Link from 'next/link';
import { ShareButtons } from '@/components/share-buttons';
import { AcceptButton } from '@/components/accept-button';
import { VerifiedBadge } from '@/components/verified-badge';
import { FollowQuestionButton } from '@/components/follow-question-button';
import { ReadMore } from '@/components/read-more';
import { formatDistanceToNow } from 'date-fns';
import { siteOrigin } from '@/lib/site';

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
  followerCount?: number;
  createdAt: string;
  deletedAt?: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    isVerified?: boolean;
  };
  community: {
    id: string;
    slug: string;
    name: string;
  } | null;
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>;
}

interface Answer {
  id: string;
  body: string;
  voteScore: number;
  isAccepted: boolean;
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    isVerified?: boolean;
    profile?: { credential: string | null } | null;
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seoSlug: string }>;
}): Promise<Metadata> {
  const { seoSlug } = await params;
  try {
    const post = await serverApiFetch<Post>(`/api/v1/posts/${seoSlug}?view=0`);
    return {
      title: `${post.title} — askvyo`,
      description: post.body.substring(0, 160),
      alternates: { canonical: `/q/${post.seoSlug}` },
      openGraph: {
        title: post.title,
        description: post.body.substring(0, 160),
        type: 'article',
        url: `/q/${post.seoSlug}`,
      },
      twitter: { card: 'summary_large_image', title: post.title, description: post.body.substring(0, 160) },
    };
  } catch {
    return { title: 'Post not found' };
  }
}

export default async function PostPage({ params, searchParams }: { params: Promise<{ seoSlug: string }>; searchParams: Promise<{ sort?: string }> }) {
  const { seoSlug } = await params;
  const sort = (await searchParams).sort === 'recent' ? 'recent' : 'suggested';
  let post: Post | null = null;
  let answers: Answer[] = [];
  let related: Array<{ id: string; seoSlug: string; title: string; answerCount: number }> = [];

  try {
    post = await serverApiFetch<Post>(`/api/v1/posts/${seoSlug}`);
    const response = await serverApiFetch<{ data: Answer[]; nextCursor: string | null }>(
      `/api/v1/posts/${post.id}/answers?limit=50&sort=${sort}`, undefined, { cache: 'no-store' },
    );
    answers = response.data;
    related = await serverApiFetch<typeof related>(`/api/v1/posts/${post.id}/related?limit=5`).catch(() => []);
  } catch (error) {
    console.error('Failed to fetch post:', error);
    notFound();
  }

  if (!post || post.deletedAt) notFound();

  // Structured data so Google can show this as a Q&A rich result.
  const origin = siteOrigin();
  const accepted = answers.find((a) => a.isAccepted);
  const toAnswer = (a: Answer) => ({
    '@type': 'Answer',
    text: a.body.slice(0, 2000),
    upvoteCount: a.voteScore,
    dateCreated: a.createdAt,
    url: `${origin}/q/${post!.seoSlug}#answer-${a.id}`,
    author: { '@type': 'Person', name: a.author.displayName },
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: post.title,
      text: post.body.slice(0, 2000),
      answerCount: answers.length,
      upvoteCount: post.voteScore,
      dateCreated: post.createdAt,
      author: { '@type': 'Person', name: post.author.displayName },
      ...(accepted ? { acceptedAnswer: toAnswer(accepted) } : {}),
      suggestedAnswer: answers.filter((a) => !a.isAccepted).slice(0, 10).map(toAnswer),
    },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
      ...(post.community
        ? [{ '@type': 'ListItem', position: 2, name: post.community.name, item: `${origin}/c/${post.community.slug}` }]
        : []),
      { '@type': 'ListItem', position: post.community ? 3 : 2, name: post.title, item: `${origin}/q/${post.seoSlug}` },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
      <article className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <LanguageBadge language={post.language} />
          <span className="text-sm text-muted-foreground">{post.viewCount} views</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <div>
            <Link href={`/profile/${post.author.username}`} className="font-semibold text-foreground hover:underline">{post.author.displayName}</Link>
            <VerifiedBadge show={post.author.isVerified} />
            <p>{formatDistanceToNow(new Date(post.createdAt), {addSuffix: true})}</p>
          </div>
          {post.community && (
            <>
              <span>in</span>
              <a href={`/c/${post.community.slug}`} className="hover:text-accent">
                {post.community.name}
              </a>
            </>
          )}
        </div>

        <div className="flex gap-4 mb-6">
          <VoteButtons targetId={post.id} targetType="POST" initialScore={post.voteScore} />
          <BookmarkButton postId={post.id} />
          <span className="self-center"><FollowQuestionButton postId={post.id} initialCount={post.followerCount ?? 0} /></span>
          <span className="ml-auto self-center"><ReportButton targetId={post.id} targetType="POST" /></span>
        </div>

        <div className="prose dark:prose-invert max-w-none mb-6">
          <p className="text-foreground whitespace-pre-wrap">{post.body}</p>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <a
                key={tag.tag.id}
                href={`/t/${tag.tag.slug}`}
                className="px-3 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] text-sm hover:bg-[var(--primary)] hover:text-white transition-colors"
              >
                #{tag.tag.name}
              </a>
            ))}
          </div>
        )}

        <div className="mb-2"><ShareButtons title={post.title} path={`/q/${post.seoSlug}`} /></div>

        <Comments postId={post.id} initialCount={post.commentCount} />
      </article>

      <div className="border-t border-border p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">{answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}</h2>
          {answers.length > 1 && (
            <div className="flex gap-1 rounded-full border border-border bg-[var(--surface)] p-1 text-xs">
              {(['suggested', 'recent'] as const).map((s) => (
                <Link key={s} href={`/q/${post!.seoSlug}${s === 'recent' ? '?sort=recent' : ''}`} scroll={false}
                  className={`rounded-full px-3 py-1 ${sort === s ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}>
                  {s === 'suggested' ? 'Suggested' : 'Recent'}
                </Link>
              ))}
            </div>
          )}
        </div>
        {answers.length === 0 && (
          <a href="#your-answer" className="mb-6 block rounded-xl border border-dashed border-[var(--primary)]/40 bg-[var(--primary)]/5 p-5 text-center">
            <span className="font-semibold text-[var(--primary)]">Can you answer this question?</span>
            <span className="block text-sm text-[var(--text-secondary)]">People are waiting for a good answer.</span>
          </a>
        )}

        <div className="space-y-6 mb-8">
          {answers.map((answer) => (
            <div key={answer.id} id={`answer-${answer.id}`} className={`rounded-xl border p-4 bg-[var(--surface)] ${answer.isAccepted ? 'border-green-600/50 ring-1 ring-green-600/20' : 'border-border'}`}>
              {answer.isAccepted && (
                <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-semibold">✓ Accepted Answer</p>
              )}
              <div className="flex gap-4">
                <VoteButtons targetId={answer.id} targetType="ANSWER" initialScore={answer.voteScore} />
                <div className="flex-1">
                  <div className="mb-3 text-sm text-muted-foreground">
                    <Link href={`/profile/${answer.author.username}`} className="font-semibold text-foreground hover:underline">{answer.author.displayName}</Link>
                    <VerifiedBadge show={answer.author.isVerified} />
                    {answer.author.profile?.credential && <span className="text-[var(--text-secondary)]"> · {answer.author.profile.credential}</span>}
                    <p className="text-xs">
                      {answer.updatedAt && new Date(answer.updatedAt).getTime() - new Date(answer.createdAt).getTime() > 60_000
                        ? `Updated ${formatDistanceToNow(new Date(answer.updatedAt), { addSuffix: true })}`
                        : formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <ReadMore text={answer.body} />
                  <div className="mt-4 text-sm text-muted-foreground">
                    <div className="mt-2 flex items-center gap-3">
                      <AcceptButton answerId={answer.id} questionAuthorId={post.author.id} accepted={answer.isAccepted} />
                      <ReportButton targetId={answer.id} targetType="ANSWER" />
                    </div>
                  </div>
                  <Comments answerId={answer.id} initialCount={answer.commentCount ?? 0} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div id="your-answer" className="scroll-mt-20 border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Answer</h3>
          <AnswerForm postId={post.id} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mx-6 mb-10 rounded-xl border border-border bg-[var(--surface)] p-5">
          <h2 className="mb-3 font-semibold text-foreground">Related questions</h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3">
                <Link href={`/q/${r.seoSlug}`} className="text-sm text-[var(--primary)] hover:underline">{r.title}</Link>
                <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-muted)]">{r.answerCount} answers</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
