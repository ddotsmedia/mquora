'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { apiFetch, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface AnswerFormProps {
  postId: string;
  accessToken?: string;
}

const DRAFT_KEY = (postId: string) => `askvyo-answer-draft-${postId}`;

export function AnswerForm({ postId, accessToken }: AnswerFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY(postId));
      if (saved) {
        const { text, savedAt } = JSON.parse(saved);
        if (text && text.length > 0) {
          setBody(text);
          setHasDraft(true);
          setLastSaved(new Date(savedAt));
        }
      }
    } catch { /* ignore */ }
  }, [postId]);

  // Auto-save draft to localStorage on every change (debounced)
  const saveDraft = useCallback((text: string) => {
    if (!text.trim()) {
      try { localStorage.removeItem(DRAFT_KEY(postId)); } catch { }
      setHasDraft(false);
      setLastSaved(null);
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY(postId), JSON.stringify({ text, savedAt: new Date().toISOString() }));
      setHasDraft(true);
      setLastSaved(new Date());
    } catch { /* storage full or blocked */ }
  }, [postId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setBody(text);
    saveDraft(text);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY(postId)); } catch { }
    setHasDraft(false);
    setLastSaved(null);
    setBody('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error('Please sign in to answer');
      signIn();
      return;
    }

    if (!body.trim()) {
      toast.error('Answer cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/v1/posts/${postId}/answers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken || session.user?.accessToken}` },
        body: JSON.stringify({ body }),
      });

      toast.success('Answer posted successfully');
      clearDraft();
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to post answer');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="p-4 border border-border rounded-lg text-center">
        <p className="text-muted-foreground mb-4">Sign in to answer this question</p>
        <button
          onClick={() => signIn()}
          className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={handleChange}
        placeholder="Write your answer in Malayalam or English…"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none transition-colors"
        rows={6}
        aria-label="Your answer"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {hasDraft && (
            <>
              <Save className="h-3 w-3" />
              <span>Draft saved{lastSaved ? ` · ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
              <button
                type="button"
                onClick={clearDraft}
                className="ml-1 underline hover:text-[var(--text-secondary)] transition-colors"
              >
                Discard
              </button>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-light)] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Posting…' : 'Post Answer'}
        </button>
      </div>
    </form>
  );
}
