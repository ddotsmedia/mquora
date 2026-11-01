'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Shown to the asker. Moderators and admins can lock through the API; this button covers the common case.
export function LockQuestionButton({ postId, authorId, isLocked }: { postId: string; authorId: string; isLocked: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!session?.user?.id || session.user.id !== authorId) return null;

  const toggle = async () => {
    const next = !isLocked;
    if (next && !window.confirm('Lock this question? No one will be able to add answers.')) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/posts/${postId}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.user.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: next }),
      });
      toast.success(next ? 'Question locked' : 'Question unlocked');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} disabled={busy} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] disabled:opacity-50">
      {isLocked ? 'Unlock question' : 'Lock question'}
    </button>
  );
}
