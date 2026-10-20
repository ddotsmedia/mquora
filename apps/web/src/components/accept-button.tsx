'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Shown only to the question author: mark/unmark an answer as the accepted one.
export function AcceptButton({ answerId, questionAuthorId, accepted }: { answerId: string; questionAuthorId: string; accepted: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (session?.user?.id !== questionAuthorId) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<{ accepted: boolean }>(`/api/v1/answers/${answerId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
      });
      toast.success(r.accepted ? 'Answer accepted' : 'Acceptance removed');
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
      className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        accepted ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-green-600/40 text-green-700 hover:bg-green-600/10 dark:text-green-400'
      }`}
    >
      {accepted ? '✓ Accepted' : 'Accept this answer'}
    </button>
  );
}
