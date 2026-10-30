import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { userFetch } from '@/lib/session-api';

export const metadata: Metadata = { title: 'Notification settings — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Pref = { type: string; enabled: boolean; locked: boolean };

const labels: Record<string, { title: string; help: string }> = {
  VOTE: { title: 'Votes', help: 'When someone votes on your question or answer' },
  ANSWER: { title: 'Answers', help: 'New answers to questions you follow, and accepted answers' },
  COMMENT: { title: 'Comments', help: 'Comments on your posts' },
  FOLLOW: { title: 'New followers', help: 'When someone follows you' },
  MENTION: { title: 'Mentions', help: 'When someone mentions you' },
  MODERATION: { title: 'Moderation', help: 'Required notices about your content. Always on.' },
  SYSTEM: { title: 'Announcements', help: 'Important announcements from askvyo. Always on.' },
};

async function setPreference(formData: FormData) {
  'use server';
  const type = String(formData.get('type') ?? '');
  const enabled = formData.get('enabled') === 'true';
  if (type) {
    await userFetch(`/api/v1/notifications/preferences/${encodeURIComponent(type)}`, '/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  }
  revalidatePath('/notifications/preferences');
}

export default async function NotificationPreferencesPage() {
  const { data } = await userFetch<{ data: Pref[] }>('/api/v1/notifications/preferences', '/notifications/preferences');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/notifications" className="text-sm text-[var(--primary)] hover:underline">← Back to notifications</Link>
      <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Notification settings</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Choose which notifications you receive in your notification list.</p>

      <ul className="mt-6 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {data.map((p) => {
          const label = labels[p.type] ?? { title: p.type, help: '' };
          return (
            <li key={p.type} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium text-[var(--text)]">{label.title}</p>
                <p className="text-sm text-[var(--text-secondary)]">{label.help}</p>
              </div>
              {p.locked ? (
                <span className="shrink-0 text-xs text-[var(--text-muted)]">Always on</span>
              ) : (
                <form action={setPreference} className="shrink-0">
                  <input type="hidden" name="type" value={p.type} />
                  <input type="hidden" name="enabled" value={p.enabled ? 'false' : 'true'} />
                  <button
                    className={`rounded-full px-4 py-1.5 text-sm border border-[var(--border)] ${p.enabled ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}`}
                    aria-pressed={p.enabled}
                  >
                    {p.enabled ? 'On' : 'Off'}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
