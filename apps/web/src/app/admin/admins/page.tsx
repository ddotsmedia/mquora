import { adminFetch } from '@/lib/admin-server';
import { DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import { NewAdminForm, AdminRowActions } from '@/components/admin/AdminManager';

type Admin = { id: string; email: string; displayName: string; features: string[]; createdAt: string };
type AdminFeature = { id: string; key: string; name: string; description?: string };

const LIMIT = 20;

export default async function AdminsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [adminRes, featuresRes] = await Promise.all([
    adminFetch<{ data: Admin[]; total: number }>('/admins', { query: { page, limit: LIMIT } }),
    adminFetch<AdminFeature[]>('/features'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Accounts" description="Manage admin users and their feature permissions." />
      <Panel title="Create Admin Account">
        <NewAdminForm features={featuresRes} />
      </Panel>
      <Panel>
        {adminRes.data.length ? (
          <div className="space-y-2">
            <DataTable head={['Email', 'Name', 'Features', 'Created', '']}>
              {adminRes.data.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--surface-2)]/60">
                  <td className="px-3 py-3 font-medium">{a.email}</td>
                  <td className="px-3 py-3">{a.displayName}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.features.map(f => (
                        <span key={f} className="inline-block rounded bg-[var(--surface-2)] px-2 py-1 text-xs">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(a.createdAt)}</td>
                  <td className="px-3 py-3">
                    <AdminRowActions id={a.id} email={a.email} features={a.features} allFeatures={featuresRes} />
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        ) : (
          <EmptyState title="No admins yet" />
        )}
        <Pagination basePath="/admin/admins" params={{}} page={page} limit={LIMIT} total={adminRes.total} />
      </Panel>
    </div>
  );
}
