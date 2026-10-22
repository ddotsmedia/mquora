'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentPost {
  id: string;
  seoSlug: string;
  title: string;
  body: string;
  language: string;
  createdAt: string;
  _count: { answers: number };
}

export function RecentQuestions() {
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const postsPerPage = 5;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await apiFetch<RecentPost[]>(
          `/api/v1/posts/recent?limit=20&offset=0`
        );
        setPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch recent posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const paginatedPosts = posts.slice(
    currentPage * postsPerPage,
    (currentPage + 1) * postsPerPage
  );
  const totalPages = Math.ceil(posts.length / postsPerPage);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-[var(--surface-2)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⏱️</span>
        <h2 className="text-lg font-semibold text-[var(--text)]">Recent Questions</h2>
      </div>
      <div className="space-y-3">
        {paginatedPosts.map((post) => (
          <Link key={post.id} href={`/q/${post.seoSlug}`}>
            <article className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/30 hover:shadow-sm transition-all group cursor-pointer">
              <h3 className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)] transition-colors line-clamp-2 mb-2">
                {post.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-2">
                {post.body.slice(0, 100)}...
              </p>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {post._count.answers} answers
                </span>
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-xs font-medium rounded-full border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--surface-2)] transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 text-xs font-medium rounded-full border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--surface-2)] transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
