'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { timeAgo } from '@/lib/time-ago';
import { FileText, Pencil, Send, Trash2 } from 'lucide-react';

interface Draft {
  id: string;
  seoSlug: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  community?: { id: string; slug: string; name: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
}

export default function DraftsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/drafts');
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.accessToken) return;
    apiFetch<{ data: Draft[] }>('/api/v1/posts/me/drafts', {
      headers: { Authorization: `Bearer ${session.user.accessToken}` },
    })
      .then((r) => setDrafts(r.data))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, [session?.user?.accessToken]);

  const publishDraft = async (id: string) => {
    if (!session?.user?.accessToken) return;
    setPublishing(id);
    try {
      const res = await apiFetch<{ id: string; seoSlug: string }>(`/api/v1/posts/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      router.push(`/q/${res.seoSlug}`);
    } catch {
      alert('Failed to publish');
      setPublishing(null);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!session?.user?.accessToken) return;
    if (!confirm('Delete this draft?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/v1/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">My Drafts</h1>
          <p className="text-sm text-[var(--text-secondary)]">{drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/ask"
          className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          New question
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="font-medium text-[var(--text)]">No drafts yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Save a question as a draft to continue later.</p>
          <Link href="/ask" className="mt-4 inline-block rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90">
            Ask a question
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {drafts.map((draft) => (
            <li key={draft.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text)] line-clamp-2">{draft.title}</p>
                  {draft.body && draft.body !== draft.title && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{draft.body}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>Saved {timeAgo(draft.updatedAt)}</span>
                    {draft.community && (
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">{draft.community.name}</span>
                    )}
                    {draft.tags.slice(0, 3).map(({ tag }) => (
                      <span key={tag.id} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">#{tag.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/ask?draft=${draft.id}`}
                    className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => publishDraft(draft.id)}
                    disabled={publishing === draft.id}
                    className="rounded-lg p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50"
                    title="Publish"
                  >
                    <Send size={16} />
                  </button>
                  <button
                    onClick={() => deleteDraft(draft.id)}
                    disabled={deleting === draft.id}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
