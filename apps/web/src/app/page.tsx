'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PostCard } from '@/components/post-card';
import { TrendingSidebar } from '@/components/TrendingSidebar';
import { PopularThisWeek } from '@/components/PopularThisWeek';
import { RecentQuestions } from '@/components/RecentQuestions';
import { QuestionsByCategory } from '@/components/QuestionsByCategory';
import { apiFetch } from '@/lib/api';
import { QuestionOfTheDay } from '@/components/QuestionOfTheDay';

type Post = Parameters<typeof PostCard>[0] & { id: string };
type Stats = { communities: number; questions: number; answers: number; topics: number; members: number };
type Tab = 'latest' | 'top' | 'unanswered' | 'foryou';

const PUBLIC_TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'latest', label: 'Latest', path: '/api/v1/posts?limit=20' },
  { id: 'top', label: 'Top this week', path: '/api/v1/trending/posts?limit=20' },
  { id: 'unanswered', label: 'Unanswered', path: '/api/v1/trending/unanswered?limit=20' },
];

export default function Home() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>('latest');
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const TABS: { id: Tab; label: string; path: string }[] = [
    ...(session ? [{ id: 'foryou' as Tab, label: '✨ For You', path: '/api/v1/feed/for-you?limit=20' }] : []),
    ...PUBLIC_TABS,
  ];

  useEffect(() => {
    apiFetch<Stats>('/api/v1/trending/stats').then(setStats).catch(() => setStats(null));
  }, []);

  const load = useCallback(async (which: Tab, cursor?: string) => {
    const tabDef = TABS.find((t) => t.id === which) ?? PUBLIC_TABS.find((t) => t.id === which)!;
    const base = tabDef.path;
    const headers: Record<string, string> = {};
    if (which === 'foryou' && session?.user?.accessToken) {
      headers['Authorization'] = `Bearer ${session.user.accessToken}`;
    }
    const res = await apiFetch<{ data: Post[]; nextCursor?: string | null }>(
      cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base,
      { headers }
    );
    setPosts((prev) => (cursor ? [...prev, ...(res.data ?? [])] : res.data ?? []));
    setNextCursor(which === 'latest' ? res.nextCursor ?? null : null);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    load(tab)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [tab, load]);

  const statItems = stats
    ? [
        [stats.questions, 'Questions'],
        [stats.answers, 'Answers'],
        [stats.communities, 'Communities'],
        [stats.members, 'Members'],
      ]
    : [];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {!session && (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#123D28] via-[#1F6B45] to-[#14482F]">
          {/* Soft decorative glow, gold for the temple-lamp accent */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#D4A017]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 md:py-20">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D4A017]/30 bg-[#D4A017]/15 px-3 py-1 text-xs font-medium text-[#F3D57A]">
              🌿 Malayalam-first community
            </span>
            <h1 className="mb-3 font-malayalam text-4xl font-bold leading-tight text-white md:text-5xl">അറിവ് പങ്കുവെക്കൂ</h1>
            <p className="mb-8 max-w-2xl text-lg text-white/75">
              Ask questions, share what you know, and learn from Malayalis everywhere — in Malayalam, English or Manglish.
            </p>
            <div className="mb-10 flex flex-wrap gap-3">
              <Link href="/ask" className="rounded-full bg-[#D4A017] px-6 py-3 text-sm font-semibold text-[#17231C] shadow-lg shadow-black/20 transition hover:bg-[#E8BC45]">
                ചോദ്യം ചോദിക്കൂ →
              </Link>
              <Link href="/communities" className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20">
                Explore communities
              </Link>
            </div>
            {statItems.length > 0 && (
              <dl className="grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                {statItems.map(([n, label]) => (
                  <div key={label as string} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                    <dd className="text-2xl font-bold text-white">{(n as number).toLocaleString()}</dd>
                    <dt className="text-xs text-white/60">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Popular This Week & Recent Questions */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <PopularThisWeek />
              </div>
              <div>
                <RecentQuestions />
              </div>
            </div>

            {/* Questions by Category */}
            <div>
              <QuestionsByCategory />
            </div>

            {/* Main question feed */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--text)]">All Questions</h2>
                <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        tab === t.id ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} {...post} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                  <div className="mb-4 text-4xl">🌱</div>
                  <h3 className="mb-2 font-malayalam text-xl font-semibold text-[var(--text)]">
                    {tab === 'unanswered' ? 'എല്ലാ ചോദ്യങ്ങൾക്കും ഉത്തരമുണ്ട്' : 'ഇനിയും ചോദ്യങ്ങളില്ല'}
                  </h3>
                  <p className="mb-6 text-[var(--text-secondary)]">
                    {tab === 'unanswered' ? 'Every question has an answer. Nice!' : 'Be the first to ask a question.'}
                  </p>
                  <Link href="/ask" className="inline-block rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--primary-light)]">
                    ചോദ്യം ചോദിക്കൂ
                  </Link>
                </div>
              )}

              {nextCursor && !loading && (
                <div className="pt-4 text-center">
                  <button
                    onClick={() => load('latest', nextCursor)}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium transition hover:bg-[var(--surface-2)]"
                  >
                    കൂടുതൽ കാണുക
                  </button>
                </div>
              )}
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="space-y-4">
              <QuestionOfTheDay />
              <TrendingSidebar />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
