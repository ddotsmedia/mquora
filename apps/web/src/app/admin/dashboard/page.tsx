import Link from 'next/link';
import { Ban, FileText, MessageSquare, ShieldAlert, Users } from 'lucide-react';
import { adminFetch } from '@/lib/admin-server';
import { Badge, EmptyState, PageHeader, Panel, StatCard, formatDate } from '@/components/admin/ui';
import { ActivityChart, HorizontalBars, type DailyPoint } from '@/components/admin/Charts';

type Stats = {
  users: { total: number; today: number; banned: number };
  posts: { total: number; today: number; removed: number };
  reports: { pending: number; underReview: number; resolved: number };
  topCommunities: { name: string; slug: string; memberCount: number; postCount: number }[];
};
type Report = { id: string; targetType: string; reason: string; createdAt: string; reporter: { username: string } };
type AuditRow = { id: string; action: string; targetType: string | null; createdAt: string; actor: { username: string } | null };

const sum = (rows: DailyPoint[], k: keyof Omit<DailyPoint, 'date'>) => rows.reduce((a, r) => a + r[k], 0);

export default async function DashboardPage() {
  const [stats, ts, reports, audit] = await Promise.all([
    adminFetch<Stats>('/stats'),
    adminFetch<{ days: DailyPoint[] }>('/timeseries', { query: { days: 30 } }),
    adminFetch<{ data: Report[] }>('/reports', { query: { status: 'PENDING', limit: 5 } }),
    adminFetch<{ data: AuditRow[] }>('/audit-log', { query: { limit: 6 } }),
  ]);

  const days = ts.days;
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const newUsers7 = sum(last7, 'users');
  const newUsersPrev7 = sum(prev7, 'users');

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Live numbers for the community. Charts cover the last 30 days (UTC)." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.users.total} icon={Users} tone="green" delta={newUsers7 - newUsersPrev7} hint={`${stats.users.today} joined today`} />
        <StatCard label="Posts today" value={stats.posts.today} icon={FileText} tone="gold" hint={`${stats.posts.total.toLocaleString()} published`} />
        <StatCard label="Pending reports" value={stats.reports.pending} icon={ShieldAlert} tone="rose" hint={`${stats.reports.underReview} under review`} />
        <StatCard label="Answers (30d)" value={sum(days, 'answers')} icon={MessageSquare} tone="sky" hint={`${sum(days, 'logins')} sign-ins`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Activity · last 30 days" className="xl:col-span-2">
          <ActivityChart data={days} />
        </Panel>
        <Panel title="Top communities by posts">
          {stats.topCommunities.length ? (
            <HorizontalBars data={stats.topCommunities.map((c) => ({ name: c.name, value: c.postCount }))} />
          ) : (
            <EmptyState title="No communities yet" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Reports waiting for review"
          action={<Link href="/admin/moderation" className="text-xs text-[var(--accent)] hover:underline">Open queue →</Link>}
        >
          {reports.data.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {reports.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.reason.replace(/_/g, ' ').toLowerCase()}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {r.targetType.toLowerCase()} · reported by @{r.reporter.username} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <Badge value="PENDING" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Queue is clear" description="No pending reports." />
          )}
        </Panel>

        <Panel
          title="Recent admin activity"
          action={<Link href="/admin/audit" className="text-xs text-[var(--accent)] hover:underline">Full log →</Link>}
        >
          {audit.data.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {audit.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">@{a.actor?.username ?? 'system'}</span>{' '}
                      <span className="text-[var(--text-secondary)]">{a.action.toLowerCase().replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(a.createdAt)}</p>
                  </div>
                  <Ban className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No admin actions yet" />
          )}
        </Panel>
      </div>
    </div>
  );
}
