import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { userFetch } from '@/lib/session-api';
import { ApiError } from '@/lib/api';

export const metadata: Metadata = { title: 'Profile settings — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Me = { id: string; email: string; username: string; displayName: string; bio: string; location: string; website: string; profile?: { credential: string | null } | null };

async function save(formData: FormData) {
  'use server';
  const field = (k: string) => String(formData.get(k) ?? '').trim();
  let website = field('website');
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  try {
    await userFetch('/api/v1/users/me', '/settings', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: field('displayName'), bio: field('bio'), location: field('location'), website, credential: field('credential') || null }),
    });
  } catch (e) {
    if (e instanceof ApiError) redirect(`/settings?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect('/settings?saved=1');
}

const input =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [me, sp] = await Promise.all([userFetch<Me>('/api/v1/users/me', '/settings'), searchParams]);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Profile settings</h1>
          <p className="text-sm text-[var(--text-secondary)]">@{me.username} · {me.email}</p>
        </div>
        <Link href={`/profile/${me.username}`} className="text-sm text-[var(--primary)] hover:underline">View profile →</Link>
      </header>

      {sp.saved && <p className="mb-4 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">Saved.</p>}
      {sp.error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{sp.error}</p>}

      <form action={save} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text)]">Display name</span>
          <input name="displayName" defaultValue={me.displayName} required minLength={2} maxLength={60} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text)]">Credential</span>
          <input name="credential" defaultValue={me.profile?.credential ?? ''} maxLength={80} className={input} placeholder="e.g. Senior Software Engineer at X" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text)]">Bio</span>
          <textarea name="bio" defaultValue={me.bio} maxLength={500} rows={4} className={input} placeholder="A few words about you" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text)]">Location</span>
          <input name="location" defaultValue={me.location} maxLength={100} className={input} placeholder="e.g. Kochi, Kerala" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text)]">Website</span>
          <input name="website" defaultValue={me.website} maxLength={200} className={input} placeholder="https://example.com" />
        </label>
        <button className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-medium text-white hover:opacity-90">Save changes</button>
      </form>
    </div>
  );
}
