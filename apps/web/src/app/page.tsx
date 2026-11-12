import type { Metadata } from 'next';
import { HomePage } from '@/components/home-page';

// The homepage is a client component, so its canonical is set here on the server page.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  return <HomePage />;
}
