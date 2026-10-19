'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Join/leave a community. Membership state is loaded for signed-in users only.
export function JoinButton({ communityId, className = '' }: { communityId: string; className?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [joined, setJoined] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ communityIds: string[] }>('/api/v1/communities/memberships/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setJoined(r.communityIds.includes(communityId)))
      .catch(() => setJoined(false));
  }, [token, communityId]);

  const toggle = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/v1/communities/${communityId}/${joined ? 'leave' : 'join'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setJoined(!joined);
      toast.success(joined ? 'Left community' : 'Joined community');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const loading = status === 'loading' || (!!token && joined === null);
  return (
    <button
      onClick={toggle}
      disabled={busy || loading}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
        joined
          ? 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
          : 'bg-[var(--primary)] text-white hover:brightness-110'
      } ${className}`}
    >
      {busy ? '…' : joined ? 'Joined ✓' : 'Join'}
    </button>
  );
}
