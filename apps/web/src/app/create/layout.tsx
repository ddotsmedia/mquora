import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ask a question — askvyo' };

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
