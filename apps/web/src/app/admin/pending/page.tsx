'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, User, FileText, Loader2, ExternalLink } from 'lucide-react';

interface PendingUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: string;
}

interface PendingPost {
  id: string;
  title: string;
  language: string;
  status: string;
  createdAt: string;
  author: { username: string };
  community: { name: string } | null;
  seoSlug?: string;
}

export default function PendingPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [postTotal, setPostTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/pending', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users ?? []);
      setPosts(data.posts ?? []);
      setUserTotal(data.userTotal ?? 0);
      setPostTotal(data.postTotal ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const userAction = async (id: string, action: 'approve' | 'reject') => {
    if (!window.confirm(action === 'approve' ? 'Approve this user?' : 'Reject and delete this user?')) return;
    setBusy(id);
    await fetch(`/api/v1/admin/users/${id}/${action}`, { method: 'POST', credentials: 'include' });
    setBusy(null);
    load();
  };

  const postAction = async (id: string, action: 'approve' | 'remove') => {
    if (!window.confirm(action === 'approve' ? 'Approve and publish this post?' : 'Remove this post?')) return;
    setBusy(id);
    if (action === 'approve') {
      await fetch(`/api/v1/admin/content/${id}/approve`, { method: 'POST', credentials: 'include' });
    } else {
      await fetch(`/api/v1/admin/content/${id}/remove`, { method: 'POST', credentials: 'include' });
    }
    setBusy(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Waiting for Approval</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          New registrations and submitted questions/articles awaiting review.
        </p>
      </div>

      {/* Pending Users */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">New Registrations</h2>
          {userTotal > 0 && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {userTotal}
            </span>
          )}
        </div>

        {users.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
            No pending registrations ✓
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{u.displayName}</p>
                  <p className="text-xs text-[var(--text-muted)]">@{u.username} · {u.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(u.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => userAction(u.id, 'approve')}
                    disabled={busy === u.id}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {busy === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => userAction(u.id, 'reject')}
                    disabled={busy === u.id}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-3 w-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Posts */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Pending Questions & Articles</h2>
          {postTotal > 0 && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {postTotal}
            </span>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
            No pending posts ✓
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
            {posts.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[var(--text)] truncate">{p.title}</p>
                    {p.seoSlug && (
                      <a href={`/q/${p.seoSlug}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <ExternalLink className="h-3 w-3 text-[var(--text-muted)] hover:text-[var(--primary)]" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    by @{p.author.username}
                    {p.community && ` · ${p.community.name}`}
                    {' · '}{new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => postAction(p.id, 'approve')}
                    disabled={busy === p.id}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    Publish
                  </button>
                  <button
                    onClick={() => postAction(p.id, 'remove')}
                    disabled={busy === p.id}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
