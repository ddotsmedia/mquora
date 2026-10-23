'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';
import { Bell, Check, CheckCheck, User, FileQuestion, Terminal } from 'lucide-react';

interface AdminNotif {
  id: string;
  type: 'USER_REGISTRATION' | 'NEW_QUESTION' | 'COMMAND';
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  relatedUserId: string | null;
  relatedPostId: string | null;
  createdAt: string;
}

const typeIcon = {
  USER_REGISTRATION: User,
  NEW_QUESTION: FileQuestion,
  COMMAND: Terminal,
};

const typeColor = {
  USER_REGISTRATION: 'text-blue-400 bg-blue-500/10',
  NEW_QUESTION: 'text-emerald-400 bg-emerald-500/10',
  COMMAND: 'text-violet-400 bg-violet-500/10',
};

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const token = session?.user?.accessToken;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ items: AdminNotif[]; unreadCount: number }>('/api/v1/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifs(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    if (!token) return;
    await apiFetch(`/api/v1/admin/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (!token) return;
    await apiFetch('/api/v1/admin/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const approveUser = async (notif: AdminNotif) => {
    if (!token || !notif.relatedUserId) return;
    setActioning(notif.id);
    try {
      await apiFetch(`/api/v1/admin/users/${notif.relatedUserId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      // silent
    } finally {
      setActioning(null);
    }
  };

  const rejectUser = async (notif: AdminNotif) => {
    if (!token || !notif.relatedUserId) return;
    if (!confirm('Reject and delete this user account?')) return;
    setActioning(notif.id);
    try {
      await apiFetch(`/api/v1/admin/users/${notif.relatedUserId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      // silent
    } finally {
      setActioning(null);
    }
  };

  const approveContent = async (notif: AdminNotif) => {
    if (!token || !notif.relatedPostId) return;
    setActioning(notif.id);
    try {
      await apiFetch(`/api/v1/admin/content/${notif.relatedPostId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      // silent
    } finally {
      setActioning(null);
    }
  };

  const rejectContent = async (notif: AdminNotif) => {
    if (!token || !notif.relatedPostId) return;
    setActioning(notif.id);
    try {
      await apiFetch(`/api/v1/admin/content/${notif.relatedPostId}/remove`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      // silent
    } finally {
      setActioning(null);
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--surface)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {unreadCount > 0 ? `${unreadCount} pending action${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-16">
          <Bell className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const Icon = typeIcon[n.type] ?? Bell;
            const colorClass = typeColor[n.type] ?? 'text-gray-400 bg-gray-500/10';
            const busy = actioning === n.id;

            return (
              <div
                key={n.id}
                className={`rounded-xl border p-4 transition ${
                  n.isRead
                    ? 'border-[var(--border)] bg-[var(--surface)] opacity-60'
                    : 'border-[var(--accent)]/30 bg-[var(--surface)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{n.title}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{n.body}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">{timeAgo(n.createdAt)}</span>
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            title="Mark read"
                            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!n.isRead && n.type === 'USER_REGISTRATION' && n.relatedUserId && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => approveUser(n)}
                          disabled={busy}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {busy ? '…' : '✓ Approve user'}
                        </button>
                        <button
                          onClick={() => rejectUser(n)}
                          disabled={busy}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {busy ? '…' : '✕ Reject'}
                        </button>
                        {n.link && (
                          <a
                            href={n.link}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                          >
                            View profile →
                          </a>
                        )}
                      </div>
                    )}

                    {!n.isRead && n.type === 'NEW_QUESTION' && n.relatedPostId && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => approveContent(n)}
                          disabled={busy}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {busy ? '…' : '✓ Publish question'}
                        </button>
                        <button
                          onClick={() => rejectContent(n)}
                          disabled={busy}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {busy ? '…' : '✕ Remove'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
