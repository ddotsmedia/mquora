import { adminFetch } from '@/lib/admin-server';
import { setPostStatusAction } from '../actions';
import { Badge, DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import SearchInput from '@/components/admin/SearchInput';
import FilterSelect from '@/components/admin/FilterSelect';
import ActionButton from '@/components/admin/ActionButton';

type PostRow = {
  id: string;
  title: string;
  language: string;
  voteScore: number;
  answerCount: number;
  status: string;
  createdAt: string;
  pendingReports: number;
  author: { username: string };
  community: { name: string } | null;
};

const LIMIT = 20;

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: PostRow[]; total: number }>('/content', {
    query: { q: sp.q, filter: sp.filter, status: sp.status, page, limit: LIMIT },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Content" description="Every question in the community. Remove or restore posts." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Search titles…" />
          <FilterSelect
            name="filter"
            label="Show"
            options={[
              { value: '', label: 'All content' },
              { value: 'flagged', label: 'Reported only' },
            ]}
          />
          <FilterSelect
            name="status"
            label="Status"
            options={[
              { value: '', label: 'Any' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'REMOVED', label: 'Removed' },
            ]}
          />
        </div>

        {res.data.length ? (
          <DataTable head={['Title', 'Author', 'Community', 'Votes', 'Answers', 'Reports', 'Status', 'Created', '']}>
            {res.data.map((p) => (
              <tr key={p.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="max-w-xs px-3 py-3">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs uppercase text-[var(--text-muted)]">{p.language.toLowerCase()}</p>
                </td>
                <td className="px-3 py-3">@{p.author.username}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{p.community?.name ?? '—'}</td>
                <td className="px-3 py-3 tabular-nums">{p.voteScore}</td>
                <td className="px-3 py-3 tabular-nums">{p.answerCount}</td>
                <td className="px-3 py-3">
                  {p.pendingReports > 0 ? <Badge value="PENDING" className="" /> : <span className="text-[var(--text-muted)]">—</span>}
                </td>
                <td className="px-3 py-3"><Badge value={p.status} /></td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(p.createdAt)}</td>
                <td className="px-3 py-3 text-right">
                  {p.status === 'REMOVED' ? (
                    <ActionButton label="Restore" variant="primary" run={setPostStatusAction.bind(null, p.id, 'PUBLISHED')} />
                  ) : (
                    <ActionButton
                      label="Remove"
                      variant="danger"
                      confirm="Remove this post from the public site?"
                      run={setPostStatusAction.bind(null, p.id, 'REMOVED')}
                    />
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="Nothing here" description="No posts match these filters." />
        )}

        <Pagination basePath="/admin/content" params={{ q: sp.q, filter: sp.filter, status: sp.status }} page={page} limit={LIMIT} total={res.total} />
      </Panel>
    </div>
  );
}
