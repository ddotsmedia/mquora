'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Follow a topic (tag): its questions appear in your Following feed and "Questions for you".
export function FollowTopicButton({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [state, setState] = useState<{ following: boolean; followerCount: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ following: boolean; followerCount: number }>(`/api/v1/topics/${slug}/follow`, { headers: { Authorization: `Bearer ${token}` } })
      .then(setState)
      .catch(() => undefined);
  }, [token, slug]);

  const toggle = async () => {
    if (!token) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    try {
      setState(await apiFetch(`/api/v1/topics/${slug}/follow`, { method: state?.following ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}` } }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    }
  };

  return (
    <button
      onClick={toggle}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        state?.following ? 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]' : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]'
      }`}
    >
      {state?.following ? 'Following topic' : 'Follow topic'}
      {state && state.followerCount > 0 && <span className="ml-1 opacity-70">· {state.followerCount}</span>}
    </button>
  );
}
