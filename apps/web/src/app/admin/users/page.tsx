'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Ban, Check } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function UsersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'expert'>('all');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await adminApi.getUsers(filter === 'all' ? undefined : filter)) as any;
      setUsers((data && data.data) || []);
      setLoading(false);
    };
    fetchUsers();
  }, [filter]);

  const handleBan = async (userId: string) => {
    const reason = prompt('Ban reason:');
    if (reason) {
      await adminApi.banUser(userId, reason);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleUnban = async (userId: string) => {
    await adminApi.unbanUser(userId);
    setUsers(users.map(u => (u.id === userId ? { ...u, bannedAt: null } : u)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text)]">Users</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'banned', 'expert'].map(f => (
          <button
            key={f}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-muted)]">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-3 px-4">Username</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Reputation</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="py-3 px-4 font-medium">{user.username}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">{user.reputationScore}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.bannedAt
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {user.bannedAt ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.bannedAt ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Unban"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Ban"
                          >
                            <Ban className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
