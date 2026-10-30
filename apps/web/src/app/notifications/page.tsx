import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { userFetch } from '@/lib/session-api';
import { timeAgo } from '@/lib/time-ago';

export const metadata: Metadata = { title: 'Notifications — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Notif = { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };

async function markAllRead() {
  'use server';
  await userFetch('/api/v1/notifications/read-all', '/notifications', { method: 'POST' });
  revalidatePath('/notifications');
}

async function markRead(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (id) await userFetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, '/notifications', { method: 'POST' });
  revalidatePath('/notifications');
}

const icons: Record<string, string> = { VOTE: '▲', ANSWER: '💬', COMMENT: '🗨', FOLLOW: '👤', MENTION: '@', MODERATION: '🛡', SYSTEM: '📢' };

export default async function NotificationsPage() {
  const { data } = await userFetch<{ data: Notif[] }>('/api/v1/notifications?limit=50', '/notifications');
  const unread = data.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Notifications</h1>
          <p className="text-sm text-[var(--text-secondary)]">{unread ? `${unread} unread` : 'You are all caught up'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/notifications/preferences" className="text-sm text-[var(--primary)] hover:underline">Settings</Link>
          {unread > 0 && (
          <form action={markAllRead}>
            <button className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--surface-2)]">Mark all as read</button>
          </form>
        )}
        </div>
      </header>
      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">No notifications yet.</div>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {data.map((n) => (
            <li key={n.id} className={`flex gap-3 p-4 ${n.readAt ? '' : 'bg-[var(--primary)]/5'}`}>
              <span className="mt-0.5 w-6 text-center" aria-hidden>{icons[n.type] ?? '•'}</span>
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <Link href={n.link} className="font-medium text-[var(--text)] hover:underline">{n.title}</Link>
                ) : (
                  <p className="font-medium text-[var(--text)]">{n.title}</p>
                )}
                <p className="text-sm text-[var(--text-secondary)]">{n.body}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]" title="Mark as read">Mark read</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
