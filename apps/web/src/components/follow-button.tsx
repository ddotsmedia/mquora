'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Follow/unfollow a user. Hidden on your own profile (the page passes isSelf).
export function FollowButton({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ following: boolean }>(`/api/v1/follows/status/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setFollowing(r.following))
      .catch(() => setFollowing(false));
  }, [token, userId]);

  const toggle = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      if (following) {
        await apiFetch(`/api/v1/follows/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      } else {
        await apiFetch('/api/v1/follows', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ followingId: userId }),
        });
      }
      setFollowing(!following);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
        following
          ? 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]'
          : 'bg-[var(--primary)] text-white hover:opacity-90'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
