'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

// Records a signed-in user's visit to a question for their reading history. Silent on failure.
export function VisitTracker({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/v1/posts/${postId}/visit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }, [token, postId]);

  return null;
}
