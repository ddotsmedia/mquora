import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/static-page';

export const metadata: Metadata = { title: 'Terms of use for askvyo members', description: 'The terms for using askvyo, the Malayalam-first question and answer community.', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return (
    <StaticPage title="Terms of use" subtitle="Last updated: October 2026">
      <p>By using askvyo you agree to these terms.</p>
      <h2>Your content</h2>
      <p>
        You keep ownership of what you post. By posting, you allow askvyo to display and distribute it on the site. You are
        responsible for what you post and must have the right to share it.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Follow the <Link href="/guidelines" className="text-[var(--primary)] hover:underline">community guidelines</Link>. We may remove
        content or suspend accounts that break them.
      </p>
      <h2>No professional advice</h2>
      <p>Answers come from community members. They are not professional medical, legal or financial advice.</p>
      <h2>Changes</h2>
      <p>We may update these terms. Continuing to use the site means you accept the updated terms.</p>
    </StaticPage>
  );
}
