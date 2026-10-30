import { Metadata } from 'next';
import Link from 'next/link';
import { serverApiFetch } from '@/lib/api';
import { AcceptInviteButton } from '@/components/accept-invite-button';

interface InvitePreview {
  valid: boolean;
  community: { slug: string; name: string; description?: string | null; memberCount: number };
}

export const metadata: Metadata = {
  title: 'Community invite — askvyo',
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let preview: InvitePreview | null = null;

  try {
    preview = await serverApiFetch<InvitePreview>(`/api/v1/communities/invites/${token}`);
  } catch {
    preview = null;
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--text)]">Invite not found</h1>
        <p className="mt-2 text-[var(--text-secondary)]">This invite link is wrong or has been removed.</p>
        <Link href="/communities" className="mt-4 inline-block text-[var(--primary)] hover:underline">Browse communities</Link>
      </div>
    );
  }

  const { community, valid } = preview;

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm uppercase tracking-wider text-[var(--text-muted)]">You are invited to</p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--text)]">{community.name}</h1>
      {community.description && <p className="mt-3 text-[var(--text-secondary)]">{community.description}</p>}
      <p className="mt-3 text-sm text-[var(--text-muted)]">{community.memberCount} members</p>

      <div className="mt-6">
        {valid ? (
          <AcceptInviteButton inviteToken={token} communitySlug={community.slug} />
        ) : (
          <>
            <p className="text-[var(--text-secondary)]">This invite has expired or was revoked. Ask a member for a new link.</p>
            <Link href={`/c/${community.slug}`} className="mt-4 inline-block text-[var(--primary)] hover:underline">Open the community</Link>
          </>
        )}
      </div>
    </div>
  );
}
