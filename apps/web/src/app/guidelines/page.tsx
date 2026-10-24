import type { Metadata } from 'next';
import { StaticPage } from '@/components/static-page';

export const metadata: Metadata = { title: 'Community guidelines for askvyo members', description: 'Rules for asking, answering and commenting respectfully on askvyo.', alternates: { canonical: '/guidelines' } };

export default function GuidelinesPage() {
  return (
    <StaticPage title="Community guidelines" subtitle="A few simple rules that keep askvyo helpful and friendly.">
      <h2>Do</h2>
      <ul>
        <li>Ask clear questions with enough detail for others to help.</li>
        <li>Answer from knowledge or experience, and say when you are unsure.</li>
        <li>Use comments to ask for clarification or suggest improvements.</li>
        <li>Vote for helpful content and report content that breaks these rules.</li>
      </ul>
      <h2>Don&apos;t</h2>
      <ul>
        <li>Post spam, advertising or repeated self-promotion.</li>
        <li>Harass, insult or threaten anyone, or attack people for their religion, caste, gender or politics.</li>
        <li>Share false or dangerous health, legal or financial advice as fact.</li>
        <li>Post other people&apos;s private information or copyrighted content without permission.</li>
      </ul>
      <h2>Moderation</h2>
      <p>
        Moderators review reported content. Content that breaks these rules may be hidden or removed, and repeated or serious
        violations can lead to a temporary or permanent ban.
      </p>
    </StaticPage>
  );
}
