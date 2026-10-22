'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MessageCircle, Eye } from 'lucide-react';

interface PopularPost {
  id: string;
  seoSlug: string;
  title: string;
  language: string;
  viewCount: number;
  _count: { answers: number };
}

export function PopularThisWeek() {
  const [posts, setPosts] = useState<PopularPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await apiFetch<PopularPost[]>('/api/v1/posts/popular-this-week?limit=5');
        setPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch popular posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-[var(--surface-2)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔥</span>
        <h2 className="text-lg font-semibold text-[var(--text)]">Popular This Week</h2>
      </div>
      <div className="space-y-2">
        {posts.map((post) => (
          <Link key={post.id} href={`/q/${post.seoSlug}`}>
            <article className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--primary)]/30 hover:shadow-sm transition-all group cursor-pointer">
              <h3 className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)] transition-colors line-clamp-2 mb-2">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {post._count.answers}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {post.viewCount}
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
