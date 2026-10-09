/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { serverApiFetch } from '@/lib/api';
import KPITile from '@/components/admin/KPITile';
import { Users, TrendingUp, MessageCircle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function AnalyticsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyticsData = (await serverApiFetch('/admin/analytics')) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics = analyticsData || { mau: 0, dau: 0, answerRate: 0, topCommunities: [], languageBreakdown: [] };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          icon={Users}
          label="Monthly Active Users"
          value={analytics.mau}
          subtext="Last 30 days"
        />
        <KPITile
          icon={Users}
          label="Daily Active Users"
          value={analytics.dau}
          subtext="Last 24 hours"
        />
        <KPITile
          icon={MessageCircle}
          label="Answer Rate"
          value={`${(analytics.answerRate * 100).toFixed(1)}%`}
          subtext="Last 7 days"
        />
        <KPITile
          icon={TrendingUp}
          label="Communities"
          value={analytics.topCommunities.length}
          subtext="Active"
        />
      </div>

      {/* Top Communities */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Top Communities</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Members</th>
                <th className="text-left py-3 px-4">Posts (30d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {analytics.topCommunities.map((c: any) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)]">
                  <td className="py-3 px-4">{c.name}</td>
                  <td className="py-3 px-4">{c.memberCount}</td>
                  <td className="py-3 px-4">{c.postCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Language Breakdown */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Language Breakdown</h3>
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {analytics.languageBreakdown.map((item: any) => (
            <div key={item.name} className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{item.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)]"
                    style={{
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      width: `${(item.count / analytics.languageBreakdown.reduce((a: number, b: any) => a + b.count, 0)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--text)]">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
