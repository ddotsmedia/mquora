'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Eye, MessageCircle } from 'lucide-react';

interface QuestionOfTheDayData {
  id: string;
  seoSlug: string;
  title: string;
  answerCount: number;
  viewCount: number;
}

export function QuestionOfTheDay() {
  const [question, setQuestion] = useState<QuestionOfTheDayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const response = await apiFetch<{ data: QuestionOfTheDayData | null }>('/api/v1/posts/question-of-day');
        setQuestion(response.data);
      } catch (error) {
        console.error('Failed to fetch Question of the Day:', error);
        setQuestion(null);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <div className="h-6 bg-[var(--surface-2)] rounded animate-pulse mb-3"></div>
        <div className="h-20 bg-[var(--surface-2)] rounded animate-pulse"></div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl p-4 hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✨</span>
        <h3 className="text-sm font-semibold text-[var(--text)]">Question of the Day</h3>
      </div>
      <Link href={`/q/${question.seoSlug}`} className="group">
        <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)] transition-colors line-clamp-2 mb-3">
          {question.title}
        </p>
      </Link>
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" />
          {question.answerCount}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {question.viewCount}
        </span>
      </div>
    </div>
  );
}
