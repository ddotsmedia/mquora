'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

interface SavedSearch { id: string; query: string }

// Saves the current search so the user is notified when new questions match it.
export function SavedSearchButton({ query }: { query: string }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [saved, setSaved] = useState<SavedSearch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const q = query.trim().replace(/\s+/g, ' ');

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: SavedSearch[] }>('/api/v1/saved-searches', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setSaved(r.data))
      .catch(() => setSaved([]));
  }, [token]);

  if (!session || !q) return null;

  const match = saved?.find((s) => s.query.toLowerCase() === q.toLowerCase());

  const save = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ id: string }>('/api/v1/saved-searches', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      });
      setSaved([{ id: r.id, query: q }, ...(saved ?? [])]);
      toast.success('Search saved. We will tell you when new questions match.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save search');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!token || !match) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/saved-searches/${match.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setSaved((saved ?? []).filter((s) => s.id !== match.id));
      toast.success('Saved search removed');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not remove search');
    } finally {
      setBusy(false);
    }
  };

  return match ? (
    <button type="button" onClick={remove} disabled={busy} className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline disabled:opacity-50">
      Saved search · remove
    </button>
  ) : (
    <button type="button" onClick={save} disabled={busy || saved === null} className="text-sm text-[var(--primary)] underline-offset-4 hover:underline disabled:opacity-50">
      Save this search and get alerts
    </button>
  );
}
