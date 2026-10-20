'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// Hide a question from "Questions for you".
export function PassButton({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [gone, setGone] = useState(false);
  if (gone) return <span className="text-xs text-[var(--text-muted)]">Passed</span>;
  return (
    <button
      onClick={async () => {
        await apiFetch(`/api/v1/questions/${postId}/pass`, { method: 'POST', headers: { Authorization: `Bearer ${session?.user?.accessToken}` } }).catch(() => undefined);
        setGone(true);
        router.refresh();
      }}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
    >
      ✕ Pass
    </button>
  );
}
