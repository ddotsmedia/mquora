import type { Metadata } from 'next';

// /ask is a form for signed-in members. Crawlable but kept out of search results, rather than blocked.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
