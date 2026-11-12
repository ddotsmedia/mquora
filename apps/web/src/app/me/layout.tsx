import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My account — askvyo' };

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
