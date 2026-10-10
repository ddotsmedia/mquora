import Link from 'next/link';
import { adminFetch } from '@/lib/admin-server';
import { resolveReportAction } from '../actions';
import { Badge, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import ActionButton from '@/components/admin/ActionButton';

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string };
  target: { title?: string; snippet?: string; status?: string } | null;
};

const tabs = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' },
];
const LIMIT = 10;

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = tabs.some((t) => t.value === sp.status) ? (sp.status as string) : 'PENDING';
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: Report[]; total: number }>('/reports', { query: { status, page, limit: LIMIT } });
  const open = status !== 'RESOLVED';

  return (
    <div className="space-y-6">
      <PageHeader title="Moderation" description="Review reports. Removing content hides it from the public site immediately." />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/moderation?status=${t.value}`}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              status === t.value ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {res.data.length ? (
        <div className="space-y-4">
          {res.data.map((r) => (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={r.status} />
                    <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">{r.targetType.toLowerCase()}</span>
                    <span className="text-sm font-medium">{r.reason.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Reported by @{r.reporter.username} · {formatDate(r.createdAt)}</p>
                  {r.details && <p className="text-sm text-[var(--text-secondary)]">“{r.details}”</p>}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-3 text-sm">
                    {r.target ? (
                      <>
                        {r.target.title && <p className="font-medium">{r.target.title}</p>}
                        {r.target.snippet && <p className="mt-1 line-clamp-3 text-[var(--text-secondary)]">{r.target.snippet}</p>}
                        {r.target.status && <div className="mt-2"><Badge value={r.target.status} /></div>}
                      </>
                    ) : (
                      <p className="text-[var(--text-muted)]">The reported content no longer exists.</p>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <ActionButton label="Dismiss" run={resolveReportAction.bind(null, r.id, 'DISMISS')} />
                    <ActionButton label="Warn & resolve" run={resolveReportAction.bind(null, r.id, 'WARN')} />
                    <ActionButton
                      label="Remove content"
                      variant="danger"
                      confirm="Remove the reported content and resolve this report?"
                      run={resolveReportAction.bind(null, r.id, 'REMOVE')}
                    />
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState title="Nothing in this queue" description="Reports will show up here when members flag content." />
        </Panel>
      )}

      <Pagination basePath="/admin/moderation" params={{ status }} page={page} limit={LIMIT} total={res.total} />
    </div>
  );
}
