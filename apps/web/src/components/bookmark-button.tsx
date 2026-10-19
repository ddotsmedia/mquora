'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

export function BookmarkButton({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ bookmarked: boolean }>(`/api/v1/bookmarks/status/${postId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setSaved(r.bookmarked))
      .catch(() => undefined);
  }, [token, postId]);

  const toggle = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      if (saved) await apiFetch(`/api/v1/bookmarks/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      else await apiFetch('/api/v1/bookmarks', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ postId }) });
      setSaved(!saved);
      toast.success(saved ? 'Removed from saved' : 'Saved');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-60"
    >
      <Bookmark className={`h-4 w-4 ${saved ? 'fill-current text-[var(--primary)]' : ''}`} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
