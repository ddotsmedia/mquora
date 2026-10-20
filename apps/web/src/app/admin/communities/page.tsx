import { adminFetch } from '@/lib/admin-server';
import { DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import SearchInput from '@/components/admin/SearchInput';
import { CommunityRowActions, NewCommunityForm } from '@/components/admin/CommunityManager';
import ActionButton from '@/components/admin/ActionButton';
import { createStarterCommunitiesAction } from '@/app/admin/actions';

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
  postCount: number;
  createdAt: string;
};
const LIMIT = 20;

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: Community[]; total: number }>('/communities', { query: { q: sp.q, page, limit: LIMIT } });

  return (
    <div className="space-y-6">
      <PageHeader title="Communities" description="Create, rename, change visibility or remove communities." actions={<><ActionButton label="Add 12 starter communities" run={createStarterCommunitiesAction} confirm="Create the starter set (Kerala, Gulf Life, Jobs, Health, Technology…)? Existing ones are skipped." /><NewCommunityForm /></>} />
      <Panel>
        <div className="mb-4">
          <SearchInput placeholder="Search by name or slug…" />
        </div>
        {res.data.length ? (
          <DataTable head={['Community', 'Visibility', 'Members', 'Posts', 'Created', '']}>
            {res.data.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">/c/{c.slug}</p>
                  {c.description && <p className="mt-1 line-clamp-1 max-w-md text-xs text-[var(--text-secondary)]">{c.description}</p>}
                </td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{c.isPublic ? 'Public' : 'Private'}</td>
                <td className="px-3 py-3 tabular-nums">{c.memberCount.toLocaleString()}</td>
                <td className="px-3 py-3 tabular-nums">{c.postCount.toLocaleString()}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(c.createdAt)}</td>
                <td className="px-3 py-3">
                  <CommunityRowActions id={c.id} name={c.name} isPublic={c.isPublic} />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title={sp.q ? 'No communities match' : 'No communities yet'} description={sp.q ? undefined : 'Create the first one with "New community".'} />
        )}
        <Pagination basePath="/admin/communities" params={{ q: sp.q }} page={page} limit={LIMIT} total={res.total} />
      </Panel>
    </div>
  );
}
