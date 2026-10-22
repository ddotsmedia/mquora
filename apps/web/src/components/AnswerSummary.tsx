'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface AnswerSummaryProps {
  postId: string;
}

interface SummaryData {
  summary: string;
}

export function AnswerSummary({ postId }: AnswerSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await apiFetch<SummaryData>(
          `/api/v1/posts/${postId}/answer-summary`
        );
        if (response?.summary) {
          setSummary(response.summary);
        }
      } catch (error) {
        console.error('Failed to fetch answer summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [postId]);

  if (loading) {
    return (
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-[var(--border)] rounded w-32 mb-2"></div>
        <div className="space-y-2">
          <div className="h-3 bg-[var(--border)] rounded w-full"></div>
          <div className="h-3 bg-[var(--border)] rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            🤖 AI Summary of Answers
          </p>
          <p
            className={`text-sm text-blue-800 dark:text-blue-300 ${
              expanded ? '' : 'line-clamp-3'
            }`}
          >
            {summary}
          </p>
          {summary.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
