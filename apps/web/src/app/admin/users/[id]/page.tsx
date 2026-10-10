import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { adminFetch, AdminApiError } from '@/lib/admin-server';
import { Badge, DataTable, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import BanControls from '@/components/admin/BanControls';
import RoleSelect from '@/components/admin/RoleSelect';

type Detail = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  isVerified: boolean;
  reputationScore: number;
  bannedUntil: string | null;
  createdAt: string;
  _count: { posts: number; answers: number; comments: number; reports: number };
  history: { id: string; action: string; metadata: Record<string, unknown> | null; createdAt: string; actor: { username: string } | null }[];
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerIsAdmin = session?.user?.role === 'ADMIN';

  let u: Detail;
  try {
    u = await adminFetch<Detail>(`/users/${id}`);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    throw err;
  }

  const counts = [
    { label: 'Posts', value: u._count.posts },
    { label: 'Answers', value: u._count.answers },
    { label: 'Comments', value: u._count.comments },
    { label: 'Reports filed', value: u._count.reports },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={u.displayName}
        description={`@${u.username} · ${u.email}`}
        actions={
          <>
            <Badge value={u.role} />
            <Badge value={u.status} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {counts.map((c) => (
          <Panel key={c.label}>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Account" className="xl:col-span-1">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Joined</dt><dd>{formatDate(u.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Reputation</dt><dd className="tabular-nums">{u.reputationScore}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Verified</dt><dd>{u.isVerified ? 'Yes' : 'No'}</dd></div>
            {u.bannedUntil && <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Suspended until</dt><dd>{formatDate(u.bannedUntil)}</dd></div>}
          </dl>
        </Panel>

        <Panel title="Moderation" className="xl:col-span-2">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">Suspension</p>
              <BanControls userId={u.id} status={u.status} />
            </div>
            {viewerIsAdmin && (
              <div>
                <p className="mb-2 text-sm font-medium">Role</p>
                <RoleSelect userId={u.id} current={u.role} />
              </div>
            )}
            {!viewerIsAdmin && <p className="text-xs text-[var(--text-muted)]">Only admins can change roles.</p>}
          </div>
        </Panel>
      </div>

      <Panel title="History">
        {u.history.length ? (
          <DataTable head={['When', 'By', 'Action', 'Details']}>
            {u.history.map((h) => (
              <tr key={h.id}>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(h.createdAt)}</td>
                <td className="px-3 py-3">@{h.actor?.username ?? 'system'}</td>
                <td className="px-3 py-3">{h.action.toLowerCase().replace(/_/g, ' ')}</td>
                <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{h.metadata ? JSON.stringify(h.metadata) : '—'}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No admin actions on this account yet.</p>
        )}
      </Panel>
    </div>
  );
}
