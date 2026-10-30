'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Block or unblock a user. Hides their questions and answers from your feeds.
export function BlockUserButton({ username }: { username: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const isSelf = session?.user?.name === username;
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ blocked: boolean }>(`/api/v1/users/${username}/block-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setBlocked(r.blocked))
      .catch(() => setBlocked(false));
  }, [token, username]);

  if (!token || isSelf || blocked === null) return null;

  const toggle = async () => {
    if (!blocked && !window.confirm(`Block @${username}? Their questions and answers will be hidden from you.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/users/${username}/block`, { method: blocked ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}` } });
      setBlocked(!blocked);
      toast.success(blocked ? 'Unblocked' : 'Blocked');
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
      className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-red-600 disabled:opacity-60"
    >
      {blocked ? 'Unblock' : 'Block'}
    </button>
  );
}
