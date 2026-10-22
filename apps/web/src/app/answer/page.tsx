import type { Metadata } from 'next';
import Link from 'next/link';
import { userFetch } from '@/lib/session-api';
import { FollowQuestionButton } from '@/components/follow-question-button';
import { PassButton } from '@/components/pass-button';
import { timeAgo } from '@/lib/time-ago';

export const metadata: Metadata = { title: 'Answer questions — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Q = {
  id: string;
  seoSlug: string;
  title: string;
  answerCount: number;
  followerCount: number;
  createdAt: string;
  community?: { slug: string; name: string } | null;
};

export default async function AnswerPage() {
  const res = await userFetch<{ data: Q[]; personalised: boolean }>('/api/v1/feed/for-you?limit=25', '/answer');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Questions for you</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {res.personalised ? 'Open questions in your communities and topics.' : 'Open questions waiting for an answer.'}{' '}
          <Link href="/onboarding" className="text-[var(--primary)] hover:underline">Edit interests</Link>
        </p>
      </header>
      {res.data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">No open questions right now. 🎉</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {res.data.map((q) => (
            <li key={q.id} className="p-4">
              <Link href={`/q/${q.seoSlug}`} className="font-semibold leading-snug text-[var(--text)] hover:text-[var(--primary)] font-malayalam">{q.title}</Link>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {q.answerCount === 0 ? 'No answer yet' : `${q.answerCount} answer${q.answerCount === 1 ? '' : 's'}`} · asked {timeAgo(q.createdAt)}
                {q.community && <> · <Link href={`/c/${q.community.slug}`} className="hover:underline">{q.community.name}</Link></>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={`/q/${q.seoSlug}#your-answer`} className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-light)]">
                  ✎ Answer
                </Link>
                <FollowQuestionButton postId={q.id} initialCount={q.followerCount} />
                <PassButton postId={q.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
