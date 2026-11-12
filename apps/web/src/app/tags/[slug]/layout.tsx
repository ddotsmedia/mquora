import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tagged questions — askvyo' };

export default function TagLayout({ children }: { children: React.ReactNode }) {
  return children;
}
