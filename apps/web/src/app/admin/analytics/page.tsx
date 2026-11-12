import { adminFetch } from '@/lib/admin-server';
import { PageHeader, Panel, StatCard, EmptyState } from '@/components/admin/ui';
import { ActivityChart, HorizontalBars, type DailyPoint } from '@/components/admin/Charts';
import { Activity, HelpCircle, LogIn, MessageSquare, Percent, ShieldAlert, Timer, Users } from 'lucide-react';

type Analytics = {
  sessions1d: number;
  sessions30d: number;
  answers7d: number;
  posts7d: number;
  totalUsers: number;
  answerRate: number;
  topCommunities: { name: string; memberCount: number; postCount: number }[];
  languageBreakdown: { name: string; count: number }[];
};

type Extended = {
  newUsers7d: number;
  newUsersPrev7d: number;
  questions30d: number;
  unansweredQuestions30d: number;
  answeredRate30d: number | null;
  reports30d: number;
  resolved30d: number;
  avgResolutionHours: number | null;
};

export default async function AnalyticsPage() {
  const [a, ts, x] = await Promise.all([
    adminFetch<Analytics>('/analytics'),
    adminFetch<{ days: DailyPoint[] }>('/timeseries', { query: { days: 30 } }),
    adminFetch<Extended>('/analytics/extended'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Engagement and content trends. Sign-ins are counted from new sessions." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sign-ins (24h)" value={a.sessions1d} icon={LogIn} tone="green" hint={`${a.sessions30d.toLocaleString()} in 30 days`} />
        <StatCard label="Posts (7d)" value={a.posts7d} icon={Activity} tone="gold" />
        <StatCard label="Answers (7d)" value={a.answers7d} icon={MessageSquare} tone="sky" />
        <StatCard label="Answers per post" value={a.answerRate} icon={Percent} tone="rose" hint="7-day ratio" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New users (7d)" value={x.newUsers7d} icon={Users} tone="green" delta={x.newUsers7d - x.newUsersPrev7d} hint="vs previous 7 days" />
        <StatCard label="Unanswered questions (30d)" value={x.unansweredQuestions30d} icon={HelpCircle} tone="gold" hint={x.answeredRate30d === null ? 'No questions yet' : `${x.answeredRate30d}% answered`} />
        <StatCard label="Reports (30d)" value={x.reports30d} icon={ShieldAlert} tone="rose" hint={`${x.resolved30d} resolved`} />
        <StatCard label="Avg time to resolve" value={x.avgResolutionHours === null ? '—' : `${x.avgResolutionHours}h`} icon={Timer} tone="sky" hint="Reports resolved in 30 days" />
      </div>

      <Panel title="Daily activity · last 30 days">
        <ActivityChart data={ts.days} height={340} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Posts by language">
          {a.languageBreakdown.length ? (
            <HorizontalBars data={a.languageBreakdown.map((l) => ({ name: l.name.toLowerCase(), value: l.count }))} color="#D4A017" />
          ) : (
            <EmptyState title="No posts yet" />
          )}
        </Panel>
        <Panel title="Largest communities by members">
          {a.topCommunities.length ? (
            <HorizontalBars data={a.topCommunities.map((c) => ({ name: c.name, value: c.memberCount }))} color="#38bdf8" />
          ) : (
            <EmptyState title="No communities yet" />
          )}
        </Panel>
      </div>
    </div>
  );
}
