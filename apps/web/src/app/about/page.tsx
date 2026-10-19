import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/static-page';

export const metadata: Metadata = { title: 'About — mquora', description: 'mquora is a Malayalam-first question and answer community.', alternates: { canonical: '/about' } };

export default function AboutPage() {
  return (
    <StaticPage title="About mquora" subtitle="A Malayalam-first place to ask questions and share what you know.">
      <p>
        mquora is a question and answer community for Malayalam speakers everywhere. Ask in Malayalam, English or Manglish —
        whatever is easiest for you — and get answers from people who have lived it.
      </p>
      <h2>What you can do</h2>
      <ul>
        <li>Ask questions and answer others&apos;.</li>
        <li>Vote up helpful answers so the best ones rise to the top.</li>
        <li>Join <Link href="/communities" className="text-[var(--primary)] hover:underline">communities</Link> and follow <Link href="/tags" className="text-[var(--primary)] hover:underline">topics</Link> you care about.</li>
        <li>Earn reputation and appear on the <Link href="/leaderboard" className="text-[var(--primary)] hover:underline">leaderboard</Link>.</li>
      </ul>
      <h2>Our values</h2>
      <ul>
        <li>Respect every member and every language choice.</li>
        <li>Share knowledge that is accurate and useful.</li>
        <li>Keep the community safe — see our <Link href="/guidelines" className="text-[var(--primary)] hover:underline">community guidelines</Link>.</li>
      </ul>
    </StaticPage>
  );
}
