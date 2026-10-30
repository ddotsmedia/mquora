'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Private communities: ask to join. Moderators approve on the members page.
export function RequestJoinButton({ communityId }: { communityId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [state, setState] = useState<'MEMBER' | 'PENDING' | 'NONE' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ communityIds: string[] }>('/api/v1/communities/memberships/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setState(r.communityIds.includes(communityId) ? 'MEMBER' : 'NONE'))
      .catch(() => setState('NONE'));
  }, [token, communityId]);

  if (status === 'loading' || (token && state === null)) return null;

  const request = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ status: string }>(`/api/v1/communities/${communityId}/join-requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(res.status === 'MEMBER' ? 'MEMBER' : 'PENDING');
      toast.success('Request sent. A moderator will review it.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'MEMBER') return <span className="rounded-full px-4 py-1.5 text-sm text-[var(--text-secondary)]">Joined ✓</span>;
  if (state === 'PENDING') return <span className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-muted)]">Request pending</span>;
  return (
    <button onClick={request} disabled={busy} className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">
      {busy ? '…' : 'Request to join'}
    </button>
  );
}
