import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Signing you in — askvyo', robots: { index: false, follow: false } };

export default function PostLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
