'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: { posts: number };
}

interface Community {
  id: string;
  name: string;
  slug: string;
  _count?: { members: number };
}

export function TrendingSidebar() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tagsRes, commRes] = await Promise.all([
          apiFetch<{ data: Tag[] }>('/api/v1/trending/tags?limit=5'),
          apiFetch<{ data: Community[] }>('/api/v1/communities?limit=5'),
        ]);
        setTags(tagsRes.data || []);
        setCommunities(commRes.data || []);
      } catch (error) {
        console.error('Failed to fetch trending data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-6">
        <div className="h-6 bg-[var(--surface-2)] rounded animate-pulse"></div>
        <div className="h-20 bg-[var(--surface-2)] rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="sticky top-20 space-y-4">
      {/* Ask CTA */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] rounded-xl p-4 text-white">
        <p className="font-malayalam font-semibold mb-1 text-sm">ഒരു ചോദ്യം ചോദിക്കൂ</p>
        <p className="text-xs text-white/70 mb-3">Share your question with the community</p>
        <Link
          href="/ask"
          className="block text-center py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] rounded-lg text-sm font-semibold transition-all"
        >
          Ask a Question
        </Link>
      </div>

      {/* Trending Tags */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>🔥</span> Trending Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/search?q=%23${tag.slug}`}
                className="px-2.5 py-1 bg-[var(--surface-2)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] border border-[var(--border)] rounded-full text-xs transition-all font-medium"
              >
                #{tag.name}
                <span className="ml-1 text-[var(--text-muted)]">({tag._count?.posts || 0})</span>
              </Link>
            ))
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No trending topics yet</p>
          )}
        </div>
      </div>

      {/* Top Communities */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>🏛️</span> Top Communities
        </h3>
        <div className="space-y-3">
          {communities.length > 0 ? (
            communities.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-sm shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-[var(--primary)] transition-colors truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{c._count?.members || 0} members</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No communities yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
