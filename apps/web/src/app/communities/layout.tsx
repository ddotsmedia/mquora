import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Malayalam communities on askvyo — Kerala, UAE, jobs',
  description: 'Browse Malayalam communities on askvyo: Kerala, UAE, jobs, education, technology, health and more.',
  alternates: { canonical: '/communities' },
};

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
