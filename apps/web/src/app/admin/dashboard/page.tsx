/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { serverApiFetch } from '@/lib/api';
import KPITile from '@/components/admin/KPITile';
import { Users, FileText, AlertCircle, Zap } from 'lucide-react';

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statsData, usersData] = await Promise.all([
    serverApiFetch('/admin/stats') as Promise<any>,
    serverApiFetch('/admin/users?limit=5') as Promise<any>,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = statsData || { users: { total: 0, today: 0, banned: 0 }, posts: { today: 0, total: 0 }, reports: { pending: 0, underReview: 0 } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = usersData || { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Dashboard</h2>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          icon={Users}
          label="Total Users"
          value={stats.users?.total || 0}
          subtext={`+${stats.users?.today || 0} today`}
        />
        <KPITile
          icon={FileText}
          label="Posts Today"
          value={stats.posts?.today || 0}
          subtext={`${stats.posts?.total || 0} total`}
        />
        <KPITile
          icon={AlertCircle}
          label="Pending Reports"
          value={stats.reports?.pending || 0}
          subtext={`${stats.reports?.underReview || 0} under review`}
        />
        <KPITile
          icon={Zap}
          label="Banned Users"
          value={stats.users?.banned || 0}
          subtext="Active bans"
        />
      </div>

      {/* Recent Users */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Recent Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left py-3 px-4">Username</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(users.data || []).map((user: any) => (
                <tr key={user.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="py-3 px-4">{user.username}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
