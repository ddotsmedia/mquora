import Link from 'next/link';
import { adminFetch } from '@/lib/admin-server';
import { Badge, DataTable, EmptyState, PageHeader, Panel, formatDate } from '@/components/admin/ui';
import Pagination from '@/components/admin/Pagination';
import SearchInput from '@/components/admin/SearchInput';
import FilterSelect from '@/components/admin/FilterSelect';

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  reputationScore: number;
  createdAt: string;
};

const LIMIT = 20;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await adminFetch<{ data: UserRow[]; total: number }>('/users', {
    query: { q: sp.q, role: sp.role, page, limit: LIMIT },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Search, review and moderate accounts." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Search name, username or email…" />
          <FilterSelect
            name="role"
            label="Role"
            options={[
              { value: '', label: 'All roles' },
              { value: 'USER', label: 'User' },
              { value: 'TRUSTED_CONTRIBUTOR', label: 'Trusted contributor' },
              { value: 'VERIFIED_EXPERT', label: 'Verified expert' },
              { value: 'COMMUNITY_MODERATOR', label: 'Community moderator' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
        </div>

        {res.data.length ? (
          <DataTable head={['User', 'Role', 'Status', 'Reputation', 'Joined', '']}>
            {res.data.map((u) => (
              <tr key={u.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="px-3 py-3">
                  <p className="font-medium">{u.displayName}</p>
                  <p className="text-xs text-[var(--text-muted)]">@{u.username} · {u.email}</p>
                </td>
                <td className="px-3 py-3"><Badge value={u.role} /></td>
                <td className="px-3 py-3"><Badge value={u.status} /></td>
                <td className="px-3 py-3 tabular-nums">{u.reputationScore}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-[var(--accent)] hover:underline">Open →</Link>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No users match" description="Try a different search or role filter." />
        )}

        <Pagination basePath="/admin/users" params={{ q: sp.q, role: sp.role }} page={page} limit={LIMIT} total={res.total} />
      </Panel>
    </div>
  );
}
