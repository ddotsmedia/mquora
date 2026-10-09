'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PostCard } from '@/components/post-card';
import { TrendingSidebar } from '@/components/TrendingSidebar';
import { apiFetch } from '@/lib/api';

interface Post {
  id: string;
  seoSlug: string;
  title: string;
  body?: string;
  language: string;
  voteScore: number;
  answerCount: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
  community?: {
    id: string;
    slug: string;
    name: string;
  };
}

interface FeedResponse {
  data: Post[];
  nextCursor: string | null;
}

export default function Home() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiFetch<FeedResponse>('/api/v1/posts?limit=20');
        setPosts(response.data || []);
        setNextCursor(response.nextCursor || null);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <main className="bg-[var(--bg)] min-h-screen">
      {/* Hero Banner */}
      {!session && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332]">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[var(--accent)]/10" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/20 rounded-full text-[var(--accent-light)] text-xs font-medium mb-4">
                🌿 Malayalam-first community
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white font-malayalam mb-2 leading-tight">
                അറിവ് പങ്കുവെക്കൂ
              </h1>
              <p className="text-white/70 mb-6 max-w-2xl">
                Kerala's first knowledge community platform
              </p>
              <div className="flex gap-3 flex-wrap mb-6">
                <Link
                  href="/ask"
                  className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold rounded-full text-sm transition-all shadow-md"
                >
                  ചോദ്യം ചോദിക്കൂ →
                </Link>
                <Link
                  href="/discover"
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full text-sm transition-all backdrop-blur border border-white/20"
                >
                  Explore Communities
                </Link>
              </div>
              <div className="flex gap-6 text-sm text-white/60">
                <span>
                  <strong className="text-white">10</strong> Communities
                </span>
                <span>
                  <strong className="text-white">5</strong> Questions
                </span>
                <span>
                  <strong className="text-white">15</strong> Topics
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Feed header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg text-[var(--text)]">Latest Questions</h2>
              <div className="flex gap-1 text-xs">
                {['Latest', 'Top', 'Unanswered'].map((tab) => (
                  <button
                    key={tab}
                    className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] text-[var(--text-secondary)] transition-all text-xs font-medium"
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] animate-pulse"
                  ></div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🤔</div>
                <h3 className="text-xl font-semibold text-[var(--text)] mb-2 font-malayalam">
                  ഇനിയും ചോദ്യങ്ങളില്ല
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">Be the first to ask in this community!</p>
                <Link
                  href="/ask"
                  className="inline-block px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-semibold rounded-full transition-all"
                >
                  ചോദ്യം ചോദിക്കൂ
                </Link>
              </div>
            )}

            {/* Load more */}
            {nextCursor && (
              <div className="text-center pt-4">
                <button className="px-6 py-3 rounded-full border border-[var(--border)] hover:bg-[var(--surface-2)] font-medium text-sm transition-all">
                  കൂടുതൽ കാണുക
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <TrendingSidebar />
          </div>
        </div>
      </div>
    </main>
  );
}
