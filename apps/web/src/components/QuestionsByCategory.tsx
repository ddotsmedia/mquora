'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
  featuredPost: {
    id: string;
    seoSlug: string;
    title: string;
  } | null;
}

export function QuestionsByCategory() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiFetch<CategoryData[]>('/api/v1/posts/by-category?limit=10');
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📚</span>
        <h2 className="text-lg font-semibold text-[var(--text)]">Questions by Category</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((category) => (
          <Link key={category.id} href={`/t/${category.slug}`}>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)]/30 hover:shadow-sm transition-all group h-full cursor-pointer flex flex-col">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors mb-1">
                  {category.name}
                </h3>
                {category.featuredPost && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                    {category.featuredPost.title}
                  </p>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {category.questionCount} {category.questionCount === 1 ? 'question' : 'questions'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
