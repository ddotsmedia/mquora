'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

export function SubscribeButton({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ isSubscribed: boolean }>(`/api/v1/posts/${postId}/subscription-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setIsSubscribed(r.isSubscribed))
      .catch(() => undefined);
  }, [token, postId]);

  const toggle = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const result = await apiFetch<{ isSubscribed: boolean }>(`/api/v1/posts/${postId}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsSubscribed(result.isSubscribed);
      toast.success(result.isSubscribed ? "You'll be notified of new answers" : 'Unsubscribed');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update subscription');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={isSubscribed}
      title="Get notified of new answers"
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-60"
    >
      <Bell className={`h-4 w-4 ${isSubscribed ? 'fill-current text-[var(--primary)]' : ''}`} />
      {isSubscribed ? 'Subscribed' : 'Subscribe'}
    </button>
  );
}
