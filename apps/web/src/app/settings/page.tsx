import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { userFetch } from '@/lib/session-api';
import { ApiError } from '@/lib/api';
import { PasswordChangeForm } from '@/components/password-change-form';
import { DigestToggle } from '@/components/digest-toggle';
import { TwoFactorSettings } from '@/components/two-factor-settings';

export const metadata: Metadata = { title: 'Settings — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Me = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  profile?: { credential: string | null } | null;
};

async function saveProfile(formData: FormData) {
  'use server';
  const field = (k: string) => String(formData.get(k) ?? '').trim();
  let website = field('website');
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  try {
    await userFetch('/api/v1/users/me', '/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: field('displayName'),
        bio: field('bio'),
        location: field('location'),
        website,
        credential: field('credential') || null,
      }),
    });
  } catch (e) {
    if (e instanceof ApiError) redirect(`/settings?tab=profile&error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect('/settings?tab=profile&saved=1');
}

const input =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'security', label: 'Security' },
  { id: 'account', label: 'Account' },
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; tab?: string }>;
}) {
  const [me, sp] = await Promise.all([
    userFetch<Me>('/api/v1/users/me', '/settings'),
    searchParams,
  ]);

  const tab = (sp.tab ?? 'profile') as 'profile' | 'password' | 'security' | 'account';

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)]">@{me.username} · {me.email}</p>
        </div>
        <Link href={`/profile/${me.username}`} className="text-sm text-[var(--primary)] hover:underline">
          View profile →
        </Link>
      </header>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 scrollbar-none">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/settings?tab=${t.id}`}
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {sp.saved && (
        <p className="mb-4 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Saved successfully.
        </p>
      )}
      {sp.error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{sp.error}</p>
      )}

      {/* ── Profile tab ─────────────────────────────────────────── */}
      {tab === 'profile' && (
        <form action={saveProfile} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-semibold text-[var(--text)]">Public profile</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text)]">Display name</span>
            <input name="displayName" defaultValue={me.displayName} required minLength={2} maxLength={60} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text)]">Credential</span>
            <input
              name="credential"
              defaultValue={me.profile?.credential ?? ''}
              maxLength={80}
              className={input}
              placeholder="e.g. Senior Software Engineer at X"
            />
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
          <button className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-medium text-white hover:opacity-90">
            Save changes
          </button>
        </form>
      )}

      {/* ── Password tab ─────────────────────────────────────────── */}
      {tab === 'password' && <PasswordChangeForm />}

      {tab === 'security' && <TwoFactorSettings />}

      {/* ── Account tab ─────────────────────────────────────────── */}
      {tab === 'account' && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-semibold text-[var(--text)]">Account</h2>

          <div className="rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm font-medium text-[var(--text)]">Username</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">@{me.username}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Username changes are not available from settings. Contact support if you need to change it.</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm font-medium text-[var(--text)]">Email address</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{me.email}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Email changes require identity verification. Contact support.</p>
          </div>

          <DigestToggle />

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              To delete your account and all your content, email{' '}
              <a href="mailto:support@askvyo.com" className="text-[var(--primary)] hover:underline">
                support@askvyo.com
              </a>{' '}
              from your registered address.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
