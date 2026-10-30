'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

interface Revision { id: string; body: string; createdAt: string }

// Edit (author only) and view edit history for an answer.
export function AnswerActions({ answerId, authorId, body }: { answerId: string; authorId: string; body: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const isAuthor = !!session?.user?.id && session.user.id === authorId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Revision[] | null>(null);

  const save = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/answers/${answerId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      toast.success('Answer updated');
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async () => {
    if (history) return setHistory(null);
    try {
      const res = await apiFetch<{ data: Revision[] }>(`/api/v1/answers/${answerId}/revisions`);
      setHistory(res.data);
    } catch {
      toast.error('Could not load history');
    }
  };

  const link = 'text-xs text-[var(--text-muted)] hover:text-[var(--primary)]';

  return (
    <div className="mt-3">
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"
          />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || draft.trim().length < 2} className="rounded bg-[var(--primary)] px-3 py-1 text-sm text-white disabled:opacity-60">Save</button>
            <button onClick={() => { setEditing(false); setDraft(body); }} className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)]">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          {isAuthor && <button onClick={() => setEditing(true)} className={link}>Edit</button>}
          <button onClick={loadHistory} className={link}>{history ? 'Hide edit history' : 'Edit history'}</button>
        </div>
      )}

      {history && (
        <ul className="mt-3 space-y-2 border-l-2 border-[var(--border)] pl-3">
          {history.length === 0 && <li className="text-xs text-[var(--text-muted)]">No earlier versions.</li>}
          {history.map((r) => (
            <li key={r.id} className="text-sm text-[var(--text-secondary)]">
              <p className="text-xs text-[var(--text-muted)]">{new Date(r.createdAt).toLocaleString()}</p>
              <p className="whitespace-pre-wrap">{r.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
