import { adminFetch } from '@/lib/admin-server';
import { DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import SearchInput from '@/components/admin/SearchInput';
import { NewTagForm, TagRowActions } from '@/components/admin/TagManager';

type Tag = { id: string; name: string; slug: string; postCount: number; createdAt: string };
const LIMIT = 30;

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: Tag[]; total: number }>('/tags', { query: { q: sp.q, page, limit: LIMIT } });

  return (
    <div className="space-y-6">
      <PageHeader title="Tags" description="Topics people attach to questions. Most used first." />
      <Panel title="Add a tag">
        <NewTagForm />
      </Panel>
      <Panel>
        <div className="mb-4">
          <SearchInput placeholder="Search tags…" />
        </div>
        {res.data.length ? (
          <DataTable head={['Tag', 'Slug', 'Posts', 'Created', '']}>
            {res.data.map((t) => (
              <tr key={t.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3 font-medium">#{t.name}</td>
                <td className="px-3 py-3 font-mono text-xs text-[var(--text-muted)]">{t.slug}</td>
                <td className="px-3 py-3 tabular-nums">{t.postCount.toLocaleString()}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(t.createdAt)}</td>
                <td className="px-3 py-3">
                  <TagRowActions id={t.id} name={t.name} postCount={t.postCount} />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title={sp.q ? 'No tags match' : 'No tags yet'} />
        )}
        <Pagination basePath="/admin/tags" params={{ q: sp.q }} page={page} limit={LIMIT} total={res.total} />
      </Panel>
    </div>
  );
}
