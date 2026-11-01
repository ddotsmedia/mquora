'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

export interface BlockedUser { username: string; displayName: string | null }

// Lists the people this user has blocked, with an unblock action.
export function BlockedUsersList({ initial }: { initial: BlockedUser[] }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [users, setUsers] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const unblock = async (username: string) => {
    if (!token) return;
    setBusy(username);
    try {
      await apiFetch(`/api/v1/users/${encodeURIComponent(username)}/block`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.username !== username));
      toast.success(`Unblocked @${username}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not unblock');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] p-4">
      <div>
        <h2 className="font-semibold text-[var(--text)]">Blocked users</h2>
        <p className="text-sm text-[var(--text-secondary)]">Blocked people cannot see your activity or interact with you. You can unblock them here.</p>
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">You have not blocked anyone.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {users.map((u) => (
            <li key={u.username} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text)]">{u.displayName || `@${u.username}`}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">@{u.username}</p>
              </div>
              <button
                type="button"
                onClick={() => unblock(u.username)}
                disabled={busy === u.username}
                className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1 text-sm text-[var(--text)] disabled:opacity-50"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
