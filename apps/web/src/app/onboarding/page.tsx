import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { userFetch } from '@/lib/session-api';
import { InterestPicker } from './picker';

export const metadata: Metadata = { title: 'Your interests — askvyo', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Community = { id: string; slug: string; name: string; description: string | null };
type Tag = { id: string; name: string };

async function save(communityIds: string[], tagIds: string[]) {
  'use server';
  await userFetch('/api/v1/me/onboarding', '/onboarding', { method: 'POST', body: JSON.stringify({ communityIds, tagIds }) });
  redirect('/following');
}

async function skip() {
  'use server';
  await userFetch('/api/v1/me/onboarding/skip', '/onboarding', { method: 'POST' });
  redirect('/');
}

export default async function OnboardingPage() {
  const [mine, communities, tags] = await Promise.all([
    userFetch<{ onboarded: boolean; communityIds: string[]; tagIds: string[] }>('/api/v1/me/interests', '/onboarding'),
    serverApiFetch<{ data: Community[] }>('/api/v1/trending/communities?limit=50', undefined, { cache: 'no-store' }).then((r) => r.data).catch(() => []),
    serverApiFetch<{ data: Tag[] }>('/api/v1/tags?limit=30', undefined, { cache: 'no-store' }).then((r) => r.data).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-[var(--primary)]">Welcome to askvyo</p>
      <h1 className="mt-1 font-malayalam text-3xl font-bold text-[var(--text)]">നിങ്ങളുടെ താൽപര്യങ്ങൾ എന്തൊക്കെ?</h1>
      <p className="mb-8 mt-2 text-[var(--text-secondary)]">Pick at least 3 — we&apos;ll fill your Following feed and suggest questions you can answer.</p>
      {communities.length + tags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--text-muted)]">No communities yet — an admin needs to create some first.</p>
      ) : (
        <InterestPicker
          communities={communities.map((c) => ({ id: c.id, slug: c.slug, name: c.name, hint: c.description ?? undefined }))}
          topics={tags}
          initialCommunities={mine.communityIds}
          initialTopics={mine.tagIds}
          save={save}
          skip={skip}
        />
      )}
    </div>
  );
}
