import type { Metadata } from 'next';
import { StaticPage } from '@/components/static-page';

export const metadata: Metadata = { title: 'askvyo privacy policy — how we use your data', description: 'How askvyo collects, uses and protects your personal information.', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy policy" subtitle="Last updated: October 2026">
      <h2>What we collect</h2>
      <ul>
        <li>Account details you give us: name, username, email and password (stored only as a secure hash).</li>
        <li>Content you post: questions, answers, comments, votes and profile information.</li>
        <li>Basic technical data needed to run the site, such as login sessions and error logs.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show your public posts and profile.</li>
        <li>To send you notifications inside the site.</li>
        <li>To keep the community safe and fight spam and abuse.</li>
      </ul>
      <h2>What is public</h2>
      <p>Your display name, username, profile details and everything you post are public. Your email address is never shown.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile at any time in Settings. To delete your account, contact the site administrators.</p>
      <h2>Security and backups</h2>
      <p>Data is stored on secured servers and backed up daily. Backups kept off the server are encrypted.</p>
    </StaticPage>
  );
}
