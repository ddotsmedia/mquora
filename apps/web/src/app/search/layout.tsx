import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search — askvyo',
  description: 'Search questions and answers on askvyo in Malayalam, English or Manglish.',
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
