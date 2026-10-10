import { adminFetch } from '@/lib/admin-server';
import { DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import FilterSelect from '@/components/admin/FilterSelect';

type Row = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { username: string; role: string } | null;
};
const LIMIT = 25;
const actions = ['USER_BAN', 'USER_UNBAN', 'USER_ROLE_CHANGE', 'CONTENT_REMOVE', 'CONTENT_RESTORE', 'REPORT_DISMISS', 'REPORT_REMOVE', 'REPORT_WARN', 'FLAG_SET'];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: Row[]; total: number }>('/audit-log', { query: { action: sp.action, page, limit: LIMIT } });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Every admin and moderator action, newest first." />
      <Panel>
        <div className="mb-4">
          <FilterSelect
            name="action"
            label="Action"
            options={[{ value: '', label: 'All actions' }, ...actions.map((a) => ({ value: a, label: a.toLowerCase().replace(/_/g, ' ') }))]}
          />
        </div>
        {res.data.length ? (
          <DataTable head={['When', 'Who', 'Action', 'Target', 'Details']}>
            {res.data.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-3 py-3 text-[var(--text-secondary)]">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-3">
                  @{r.actor?.username ?? 'system'}{' '}
                  {r.actor && <span className="text-xs text-[var(--text-muted)]">({r.actor.role.toLowerCase().replace(/_/g, ' ')})</span>}
                </td>
                <td className="px-3 py-3 text-sm">{r.action.toLowerCase().replace(/_/g, ' ')}</td>
                <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
                  {r.targetType ? `${r.targetType.toLowerCase()} · ${r.targetId?.slice(0, 10)}…` : '—'}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-[var(--text-muted)]">
                  {r.metadata && Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No actions recorded" description="Actions appear here once an admin or moderator makes a change." />
        )}
        <Pagination basePath="/admin/audit" params={{ action: sp.action }} page={page} limit={LIMIT} total={res.total} />
      </Panel>
    </div>
  );
}
