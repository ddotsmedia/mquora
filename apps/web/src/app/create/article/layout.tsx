import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Write an article — askvyo', robots: { index: false, follow: false } };

export default function CreateArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
