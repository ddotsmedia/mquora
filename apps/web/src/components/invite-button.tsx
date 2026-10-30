'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Members can create an invite link for a community and copy it.
export function InviteButton({ communityId, className = '' }: { communityId: string; className?: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [isMember, setIsMember] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ communityIds: string[] }>('/api/v1/communities/memberships/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setIsMember(r.communityIds.includes(communityId)))
      .catch(() => setIsMember(false));
  }, [token, communityId]);

  if (!token || !isMember) return null;

  const createInvite = async () => {
    setBusy(true);
    try {
      const { token: inviteToken } = await apiFetch<{ token: string; expiresAt: string }>(
        `/api/v1/communities/${communityId}/invites`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      );
      const url = `${window.location.origin}/invite/${inviteToken}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Invite link copied. It is valid for 7 days.');
      } catch {
        window.prompt('Copy this invite link (valid for 7 days):', url);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create invite');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={createInvite}
      disabled={busy}
      className={`rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-60 ${className}`}
    >
      {busy ? '…' : 'Invite people'}
    </button>
  );
}
