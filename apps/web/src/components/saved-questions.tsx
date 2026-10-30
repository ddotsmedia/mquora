'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { PostCard } from '@/components/post-card';

type Post = Parameters<typeof PostCard>[0] & { id: string };
export interface Collection { id: string; name: string; count: number }
export interface SavedItem { postId: string; collectionId: string | null; post: Post }

// Saved questions with collections: filter, create, move a question, delete a collection.
export function SavedQuestions({ collections, items, active }: { collections: Collection[]; items: SavedItem[]; active: string | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const activeCollection = collections.find((c) => c.id === active) ?? null;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/api/v1/bookmarks/collections', { method: 'POST', headers: auth, body: JSON.stringify({ name }) });
      setName('');
      toast.success('Collection created');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create collection');
    } finally {
      setBusy(false);
    }
  };

  const move = async (postId: string, collectionId: string) => {
    if (!token) return;
    try {
      await apiFetch(`/api/v1/bookmarks/${postId}/collection`, { method: 'PATCH', headers: auth, body: JSON.stringify({ collectionId: collectionId || null }) });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not move question');
    }
  };

  const remove = async () => {
    if (!token || !activeCollection) return;
    if (!window.confirm(`Delete "${activeCollection.name}"? Its questions stay saved.`)) return;
    try {
      await apiFetch(`/api/v1/bookmarks/collections/${activeCollection.id}`, { method: 'DELETE', headers: auth });
      toast.success('Collection deleted');
      router.push('/bookmarks');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete collection');
    }
  };

  const chip = (isActive: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs ${isActive ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/bookmarks" className={chip(!active)}>All</Link>
        <Link href="/bookmarks?collection=none" className={chip(active === 'none')}>Unsorted</Link>
        {collections.map((c) => (
          <Link key={c.id} href={`/bookmarks?collection=${c.id}`} className={chip(active === c.id)}>
            {c.name} · {c.count}
          </Link>
        ))}
      </div>

      {token && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <form onSubmit={create} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New collection name"
              maxLength={40}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]"
            />
            <button type="submit" disabled={busy || !name.trim()} className="rounded bg-[var(--primary)] px-3 py-1 text-sm text-white disabled:opacity-60">Create</button>
          </form>
          {activeCollection && (
            <button onClick={remove} className="text-xs text-[var(--text-muted)] hover:text-red-600">Delete “{activeCollection.name}”</button>
          )}
        </div>
      )}

      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {items.map((it) => (
          <div key={it.postId}>
            <PostCard {...it.post} />
            {token && collections.length > 0 && (
              <div className="flex items-center gap-2 px-4 pb-3 text-xs text-[var(--text-muted)]">
                <span>Collection:</span>
                <select
                  value={it.collectionId ?? ''}
                  onChange={(e) => move(it.postId, e.target.value)}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text)]"
                >
                  <option value="">Unsorted</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
