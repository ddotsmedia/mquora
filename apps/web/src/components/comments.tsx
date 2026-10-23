'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { timeAgo } from '@/lib/time-ago';

type Author = { id: string; username: string; displayName: string };
type Reply = { id: string; body: string; createdAt: string; author: Author };
type Comment = Reply & { replies: Reply[] };

const STAFF = ['ADMIN', 'COMMUNITY_MODERATOR'];

// Comments with one level of replies, for a question (postId) or an answer (answerId).
export function Comments({ postId, answerId, initialCount = 0 }: { postId?: string; answerId?: string; initialCount?: number }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const me = session?.user?.id;
  const canModerate = STAFF.includes(session?.user?.role ?? '');
  const listPath = postId ? `/api/v1/posts/${postId}/comments?limit=50` : `/api/v1/answers/${answerId}/comments?limit=50`;

  const [open, setOpen] = useState(initialCount > 0);
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch<{ data: Comment[] }>(listPath, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [listPath, token]);

  useEffect(() => {
    if (open && items === null) load();
  }, [open, items, load]);

  const auth = { Authorization: `Bearer ${token}` };

  const send = async (body: string, parentId?: string) => {
    if (!token) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (!body.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/api/v1/comments', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify(parentId ? { body, parentId } : postId ? { body, postId } : { body, answerId }),
      });
      if (parentId) {
        setReplyText('');
        setReplyTo(null);
      } else setText('');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not post comment');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await apiFetch(`/api/v1/comments/${id}`, { method: 'DELETE', headers: auth });
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not delete');
    }
  };

  const count = items ? items.reduce((n, c) => n + 1 + c.replies.length, 0) : initialCount;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
        💬 {count > 0 ? `${count} comment${count === 1 ? '' : 's'}` : 'Add a comment'}
      </button>
    );
  }

  const line = (c: Reply, isReply = false) => (
    <div className="text-sm">
      <span className="whitespace-pre-wrap text-[var(--text)]">{c.body}</span>
      <span className="ml-2 text-xs text-[var(--text-muted)]">
        — <Link href={`/profile/${c.author.username}`} className="text-[var(--primary)] hover:underline">{c.author.displayName}</Link> · {timeAgo(c.createdAt)}
        {!isReply && token && (
          <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="ml-2 hover:text-[var(--primary)]">Reply</button>
        )}
        {(c.author.id === me || canModerate) && (
          <button onClick={() => remove(c.id)} className="ml-2 hover:text-red-600">Delete</button>
        )}
      </span>
    </div>
  );

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-3">
      {items === null ? (
        <p className="text-sm text-[var(--text-muted)]">Loading comments…</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="border-b border-[var(--border)]/60 pb-2 last:border-0">
              {line(c)}
              {c.replies.length > 0 && (
                <ul className="mt-2 space-y-1 border-l-2 border-[var(--border)] pl-3">
                  {c.replies.map((r) => <li key={r.id}>{line(r, true)}</li>)}
                </ul>
              )}
              {replyTo === c.id && (
                <form onSubmit={(e) => { e.preventDefault(); send(replyText, c.id); }} className="mt-2 flex gap-2 pl-3">
                  <input value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={1000} autoFocus placeholder="Write a reply…"
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]" />
                  <button disabled={busy || !replyText.trim()} className="rounded-lg bg-[var(--primary)] px-3 text-sm text-white disabled:opacity-50">Reply</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
          placeholder={token ? 'Add a comment…' : 'Log in to comment'} onFocus={() => { if (!token) window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`; }}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]" />
        <button disabled={busy || !text.trim()} className="rounded-lg bg-[var(--primary)] px-3 text-sm text-white disabled:opacity-50">Comment</button>
      </form>
    </div>
  );
}
