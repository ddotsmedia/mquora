import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/api';
import { PostCard } from '@/components/post-card';

export const metadata: Metadata = {
  title: 'Discover — askvyo',
  description: 'Trending questions, popular topics and unanswered questions in the Malayalam community.',
  alternates: { canonical: '/discover' },
};
export const revalidate = 60;

type Post = Parameters<typeof PostCard>[0];
type Tag = { id: string; name: string; slug: string; postCount: number };

async function load<T>(path: string): Promise<T[]> {
  try {
    return (await serverApiFetch<{ data: T[] }>(path)).data;
  } catch (e) {
    console.error('discover load failed', path, e);
    return [];
  }
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="font-semibold text-[var(--text)]">{title}</h2>
        <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

export default async function DiscoverPage() {
  const [trending, unanswered, tags] = await Promise.all([
    load<Post>('/api/v1/trending/posts?limit=10'),
    load<Post>('/api/v1/trending/unanswered?limit=10'),
    load<Tag>('/api/v1/trending/tags?limit=20'),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <h1 className="font-malayalam text-3xl font-bold text-[var(--text)]">കണ്ടെത്തൂ</h1>
        <Section title="Trending this week" subtitle="Most upvoted and answered in the last 7 days">
          {trending.length ? (
            <div className="divide-y divide-[var(--border)]">{trending.map((p) => <PostCard key={p.id} {...p} />)}</div>
          ) : (
            <p className="p-6 text-sm text-[var(--text-muted)]">Nothing trending yet — be the first to ask.</p>
          )}
        </Section>
        <Section title="Unanswered questions" subtitle="Help someone out — answer a new question">
          {unanswered.length ? (
            <div className="divide-y divide-[var(--border)]">{unanswered.map((p) => <PostCard key={p.id} {...p} />)}</div>
          ) : (
            <p className="p-6 text-sm text-[var(--text-muted)]">Every question has an answer. 🎉</p>
          )}
        </Section>
      </div>
      <aside className="space-y-6">
        <Section title="Popular topics" subtitle="Tags with the most questions">
          {tags.length ? (
            <div className="flex flex-wrap gap-2 p-5">
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.slug}`}
                  className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]"
                >
                  #{t.name} <span className="text-[var(--text-muted)]">{t.postCount}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-[var(--text-muted)]">No topics yet.</p>
          )}
        </Section>
        <Link href="/communities" className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]">
          Browse all communities →
        </Link>
      </aside>
    </div>
  );
}
