import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { serverApiFetch, ApiError } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { FollowButton } from '@/components/follow-button';
import { formatDistanceToNow } from 'date-fns';

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
  badges: Array<{ awardedAt: string; badge: { name: string; description: string | null } }>;
  stats: { posts: number; answers: number; followers: number; following: number };
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
  return {
    title: `${user.displayName} (@${user.username}) — mquora`,
    description: user.bio || `Profile of ${user.displayName} on mquora`,
  };
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [user, session] = await Promise.all([load(username), auth()]);
  if (!user) notFound();

  const isSelf = session?.user?.id === user.id;
  const stats = [
    { label: 'Reputation', value: user.reputationScore },
    { label: 'Questions', value: user.stats.posts },
    { label: 'Answers', value: user.stats.answers },
    { label: 'Followers', value: user.stats.followers },
    { label: 'Following', value: user.stats.following },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xl font-bold text-white">
            {initials(user.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text)]">
              {user.displayName}
              {user.isVerified && <span title="Verified" className="text-base text-[var(--primary)]">✔</span>}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              @{user.username} · joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              {user.role !== 'USER' && <span className="ml-2 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs">{user.role}</span>}
            </p>
          </div>
          {isSelf ? (
            <Link href="/settings" className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--surface-2)]">
              Edit profile
            </Link>
          ) : (
            <FollowButton userId={user.id} />
          )}
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
        <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">Recent questions</h2>
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {user.posts.length > 0 ? (
            user.posts.map((post) => <PostCard key={post.id} {...post} />)
          ) : (
            <p className="p-8 text-center text-[var(--text-muted)]">No questions yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
