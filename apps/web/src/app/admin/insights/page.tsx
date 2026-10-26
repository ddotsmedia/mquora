import Link from 'next/link';
import { adminFetch } from '@/lib/admin-server';
import { DataTable, EmptyState, PageHeader, Panel } from '@/components/admin/ui';

type TopViews = {
  questions: { title: string; seoSlug: string; viewCount: number }[];
  answers: { id: string; viewCount: number; post: { seoSlug: string; title: string } }[];
};
type ZeroResults = { items: { query: string; count: number }[] };

export default async function InsightsPage() {
  const [views, zero] = await Promise.all([
    adminFetch<TopViews>('/insights/top-views'),
    adminFetch<ZeroResults>('/insights/zero-results'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" description="All-time view counts, and searches that returned no results." />

      <Panel title="Most viewed questions">
        {views.questions.length === 0 ? (
          <EmptyState title="No views yet" />
        ) : (
          <DataTable head={['Question', 'Views']}>
            {views.questions.map((q) => (
              <tr key={q.seoSlug} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3">
                  <Link href={`/q/${q.seoSlug}`} className="text-[var(--primary)] hover:underline">{q.title}</Link>
                </td>
                <td className="px-3 py-3">{q.viewCount}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel title="Most viewed answers">
        {views.answers.length === 0 ? (
          <EmptyState title="No views yet" />
        ) : (
          <DataTable head={['Answer on', 'Views']}>
            {views.answers.map((a) => (
              <tr key={a.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3">
                  <Link href={`/q/${a.post.seoSlug}#answer-${a.id}`} className="text-[var(--primary)] hover:underline">{a.post.title}</Link>
                </td>
                <td className="px-3 py-3">{a.viewCount}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel title="Searches with no results">
        {zero.items.length === 0 ? (
          <EmptyState title="No failed searches recorded" />
        ) : (
          <DataTable head={['Search', 'Times']}>
            {zero.items.map((z) => (
              <tr key={z.query} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3">{z.query}</td>
                <td className="px-3 py-3">{z.count}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
