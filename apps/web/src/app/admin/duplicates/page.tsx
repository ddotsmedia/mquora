'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { GitMerge, X, ExternalLink, Loader2 } from 'lucide-react';

interface Post {
  id: string;
  seoSlug: string;
  title: string;
  answerCount: number;
  voteScore: number;
}

interface DuplicateCandidate {
  id: string;
  score: number;
  status: string;
  sourcePost: Post;
  targetPost: Post;
}

export default function AdminDuplicatesPage() {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: DuplicateCandidate[] }>('/api/v1/admin/duplicates');
      setCandidates(res.data ?? []);
    } catch { toast.error('Failed to load duplicate candidates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const dismiss = async (id: string) => {
    setBusy(id);
    try {
      await apiFetch(`/api/v1/admin/duplicates/${id}/dismiss`, { method: 'POST' });
      setCandidates((c) => c.filter((x) => x.id !== id));
      toast.success('Dismissed');
    } catch { toast.error('Failed to dismiss'); }
    finally { setBusy(null); }
  };

  const merge = async (candidate: DuplicateCandidate, keepSource: boolean) => {
    const sourcePostId = keepSource ? candidate.targetPost.id : candidate.sourcePost.id;
    const targetPostId = keepSource ? candidate.sourcePost.id : candidate.targetPost.id;
    if (!confirm(`Merge "${sourcePostId === candidate.sourcePost.id ? candidate.sourcePost.title : candidate.targetPost.title}" INTO "${targetPostId === candidate.targetPost.id ? candidate.targetPost.title : candidate.sourcePost.title}"?\n\nAnswers from the source will be moved to the target, then the source will be archived. This cannot be undone.`)) return;
    setBusy(candidate.id);
    try {
      const res = await apiFetch<{ success: boolean; movedAnswers: number; targetSlug: string }>(
        '/api/v1/admin/questions/merge',
        { method: 'POST', body: JSON.stringify({ sourcePostId, targetPostId }) },
      );
      setCandidates((c) => c.filter((x) => x.id !== candidate.id));
      toast.success(`Merged — ${res.movedAnswers} answer(s) moved`);
    } catch (e: any) { toast.error(e.message || 'Merge failed'); }
    finally { setBusy(null); }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Duplicate Questions</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        AI-detected candidates. Choose which question to keep (the other is archived and its answers moved to the kept one).
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--text-muted)]"><Loader2 className="animate-spin h-4 w-4" /> Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
          No pending duplicate candidates 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full px-2 py-0.5">
                  {Math.round(c.score * 100)}% similar
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[{ label: 'Question A', post: c.sourcePost, keepFn: () => merge(c, false) }, { label: 'Question B', post: c.targetPost, keepFn: () => merge(c, true) }].map(({ label, post, keepFn }) => (
                  <div key={post.id} className="rounded-xl bg-[var(--surface-2)] p-4">
                    <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                    <p className="text-sm font-medium text-[var(--text)] mb-2 line-clamp-3">{post.title}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
                      <span>{post.answerCount} answers</span>
                      <span>{post.voteScore > 0 ? '+' : ''}{post.voteScore} votes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={keepFn}
                        disabled={!!busy}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-light)] disabled:opacity-50 transition-colors"
                      >
                        {busy === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
                        Keep this
                      </button>
                      <Link href={`/q/${post.seoSlug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)]">
                        <ExternalLink className="h-3 w-3" /> View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => dismiss(c.id)}
                disabled={!!busy}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Not a duplicate — dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
