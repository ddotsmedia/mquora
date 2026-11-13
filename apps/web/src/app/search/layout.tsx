import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Malayalam questions and answers — askvyo',
  description: 'Search questions and answers on askvyo in Malayalam, English or Manglish.',
  alternates: { canonical: '/search' },
  // Query results are thin and endless: keep them out of the index, keep the canonical.
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
