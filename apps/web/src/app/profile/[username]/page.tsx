import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { serverApiFetch, ApiError } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { FollowButton } from '@/components/follow-button';
import { formatDistanceToNow } from 'date-fns';
import { siteOrigin } from '@/lib/site';

export const dynamic = 'force-dynamic';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isVerified: boolean;
  reputationScore: number;
  createdAt: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  credential: string | null;
  badges: Array<{ awardedAt: string; badge: { name: string; description: string | null } }>;
  stats: { posts: number; answers: number; followers: number; following: number; views: number };
  knowsAbout: Array<{ id: string; name: string; slug: string; answerCount: number }>;
  posts: Array<{
    id: string;
    seoSlug: string;
    title: string;
    language: string;
    voteScore: number;
    answerCount: number;
    viewCount: number;
    createdAt: string;
    author: { id: string; username: string; displayName: string };
    community?: { id: string; slug: string; name: string };
  }>;
}

interface Answer {
  id: string;
  body: string;
  voteScore: number;
  isAccepted: boolean;
  createdAt: string;
  updatedAt?: string;
  post: {
    id: string;
    seoSlug: string;
    title: string;
    community?: { id: string; slug: string; name: string };
  };
  author: {
    id: string;
    username: string;
    displayName: string;
    isVerified?: boolean;
    profile?: { credential: string | null } | null;
  };
}

async function load(username: string): Promise<UserProfile | null> {
  try {
    return await serverApiFetch<UserProfile>(`/api/v1/users/${encodeURIComponent(username)}`, undefined, { cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const user = await load(username).catch(() => null);
  if (!user) return { title: 'User not found' };
  const description = user.bio
    ? user.bio.slice(0, 160)
    : `${user.displayName} has answered ${user.stats.answers} questions on askvyo, the Malayalam knowledge community.`;
  return {
    title: `${user.displayName} (@${user.username}) — askvyo`,
    description,
    alternates: { canonical: `/profile/${user.username}` },
    openGraph: {
      title: `${user.displayName} (@${user.username})`,
      description,
      type: 'profile',
      url: `/profile/${user.username}`,
    },
    twitter: { card: 'summary_large_image', title: `${user.displayName} on askvyo`, description },
  };
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { username } = await params;
  const { tab = 'questions' } = await searchParams;
  const [user, session] = await Promise.all([load(username), auth()]);
  if (!user) notFound();

  const isSelf = session?.user?.id === user.id;
  const stats = [
    { label: 'Reputation', value: user.reputationScore },
    { label: 'Questions', value: user.stats.posts },
    { label: 'Answers', value: user.stats.answers },
    { label: 'Total Views', value: user.stats.views },
    { label: 'Followers', value: user.stats.followers },
  ];

  let answers: Answer[] = [];
  if (tab === 'answers') {
    try {
      const response = await serverApiFetch<{ data: Answer[]; nextCursor: string | null }>(
        `/api/v1/users/${encodeURIComponent(username)}/answers?limit=50`, undefined, { cache: 'no-store' }
      );
      answers = response.data;
    } catch (e) {
      console.error('Failed to fetch answers:', e);
    }
  }

  const origin = siteOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.displayName,
    url: `${origin}/profile/${user.username}`,
    identifier: user.username,
    description: user.bio || undefined,
    ...(user.knowsAbout?.length ? { knowsAbout: user.knowsAbout.map((t) => t.name) } : {}),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xl font-bold text-white">
            {initials(user.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--text)]">{user.displayName}</h1>
              {user.isVerified && <span title="Verified" className="text-base text-[var(--primary)]">✔</span>}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              @{user.username} · joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              {user.role !== 'USER' && <span className="ml-2 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs">{user.role}</span>}
            </p>
            {user.credential && <p className="mt-1 text-sm text-[var(--text-secondary)]">{user.credential}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {isSelf ? (
              <Link href="/settings" className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--surface-2)]">
                Edit profile
              </Link>
            ) : (
              <>
                <FollowButton userId={user.id} />
                <Link href={`/q/new?to=${encodeURIComponent(user.username)}`} className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10">
                  Ask
                </Link>
              </>
            )}
          </div>
        </div>

        {user.bio && <p className="mt-4 whitespace-pre-line text-[var(--text)]">{user.bio}</p>}
        {(user.location || user.website) && (
          <p className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
            {user.location && <span>📍 {user.location}</span>}
            {user.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--primary)] hover:underline">
                🔗 {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-[var(--surface-2)] p-3 text-center">
              <dd className="text-lg font-semibold text-[var(--text)]">{s.value}</dd>
              <dt className="text-xs text-[var(--text-muted)]">{s.label}</dt>
            </div>
          ))}
        </dl>

        {user.knowsAbout.length > 0 && (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Knows about</h3>
            <div className="flex flex-wrap gap-2">
              {user.knowsAbout.map((c) => (
                <a key={c.id} href={`/c/${c.slug}`} className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:text-white transition-colors">
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {user.badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {user.badges.map((b) => (
              <span key={b.badge.name} title={b.badge.description ?? ''} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                🏅 {b.badge.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-sm">
            {(['questions', 'answers'] as const).map((t) => (
              <Link key={t} href={`/profile/${username}${t === 'answers' ? '?tab=answers' : ''}`} scroll={false}
                className={`rounded-full px-4 py-1.5 ${tab === t ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}>
                {t === 'answers' ? 'Answers' : 'Questions'}
              </Link>
            ))}
          </div>
          {!isSelf && <span className="text-xs text-[var(--text-muted)]">{tab === 'answers' ? user.stats.answers : user.stats.posts}</span>}
        </div>

        {tab === 'questions' ? (
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {user.posts.length > 0 ? (
              user.posts.map((post) => <PostCard key={post.id} {...post} />)
            ) : (
              <p className="p-8 text-center text-[var(--text-muted)]">No questions yet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {answers.length > 0 ? (
              answers.map((answer) => (
                <div key={answer.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="mb-2 text-sm text-[var(--text-muted)]">
                    Answered: <a href={`/q/${answer.post.seoSlug}`} className="font-semibold text-[var(--primary)] hover:underline">{answer.post.title}</a>
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">{answer.isAccepted && <span className="text-green-600 font-semibold">✓ Accepted · </span>}{answer.voteScore} votes</p>
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-[var(--text-muted)]">No answers yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
