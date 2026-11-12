import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Write an article — askvyo' };

export default function CreateArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
