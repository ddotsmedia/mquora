'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Accepts an invite and then opens the community. Signed-out users go to login first.
export function AcceptInviteButton({ inviteToken, communitySlug }: { inviteToken: string; communitySlug: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/v1/communities/invites/${inviteToken}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Joined community');
      router.push(`/c/${communitySlug}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not accept invite');
      setBusy(false);
    }
  };

  return (
    <button
      onClick={accept}
      disabled={busy}
      className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:brightness-110 transition disabled:opacity-60"
    >
      {busy ? '…' : token ? 'Join community' : 'Sign in to join'}
    </button>
  );
}
