import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top contributors — askvyo',
  description: 'The most helpful members of the Malayalam knowledge community, ranked by reputation.',
  alternates: { canonical: '/leaderboard' },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
