'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CommunitiesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await adminApi.getCommunities()) as any[];
      setCommunities(data || []);
      setLoading(false);
    };
    fetchCommunities();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">Communities</h2>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-muted)]">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Slug</th>
                  <th className="text-left py-3 px-4">Members</th>
                  <th className="text-left py-3 px-4">Posts</th>
                  <th className="text-left py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {communities.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--surface-2)]">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{c.slug}</td>
                    <td className="py-3 px-4">{c.memberCount}</td>
                    <td className="py-3 px-4">{c.postCount}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">
                      {new Date(c.createdAt).toLocaleDateString()}
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
