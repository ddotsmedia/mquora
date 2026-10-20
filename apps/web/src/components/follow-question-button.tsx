'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Follow a question to be notified about new answers. Shows how many people follow it.
export function FollowQuestionButton({ postId, initialCount = 0, compact = false }: { postId: string; initialCount?: number; compact?: boolean }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [state, setState] = useState({ following: false, followerCount: initialCount });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ following: boolean; followerCount: number }>(`/api/v1/questions/${postId}/follow`, { headers: { Authorization: `Bearer ${token}` } })
      .then(setState)
      .catch(() => undefined);
  }, [token, postId]);

  const toggle = async () => {
    if (!token) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch<{ following: boolean; followerCount: number }>(`/api/v1/questions/${postId}/follow`, {
        method: state.following ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(r);
      toast.success(r.following ? 'Following — you will be notified about new answers' : 'Unfollowed');
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        state.following ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
      }`}
    >
      <span aria-hidden>📡</span>
      {state.following ? 'Following' : 'Follow'}
      {!compact || state.followerCount > 0 ? <span className="opacity-70">· {state.followerCount}</span> : null}
    </button>
  );
}
