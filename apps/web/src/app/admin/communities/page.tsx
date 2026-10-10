import { adminFetch } from '@/lib/admin-server';
import { DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';

type Community = { id: string; name: string; slug: string; isPublic: boolean; memberCount: number; postCount: number; createdAt: string };
const LIMIT = 20;

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: Community[]; total: number }>('/communities', { query: { page, limit: LIMIT } });

  return (
    <div className="space-y-6">
      <PageHeader title="Communities" description="All active communities, largest first." />
      <Panel>
        {res.data.length ? (
          <DataTable head={['Community', 'Visibility', 'Members', 'Posts', 'Created']}>
            {res.data.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">/c/{c.slug}</p>
                </td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{c.isPublic ? 'Public' : 'Private'}</td>
                <td className="px-3 py-3 tabular-nums">{c.memberCount.toLocaleString()}</td>
                <td className="px-3 py-3 tabular-nums">{c.postCount.toLocaleString()}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No communities yet" />
        )}
        <Pagination basePath="/admin/communities" params={{}} page={page} limit={LIMIT} total={res.total} />
      </Panel>
    </div>
  );
}
