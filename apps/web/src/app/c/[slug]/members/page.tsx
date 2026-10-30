'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

interface Member {
  role: string;
  joinedAt: string;
  user: { id: string; username: string; displayName: string };
}

interface MyRole {
  role: string | null;
  isCreator: boolean;
  canManage: boolean;
}

export default function CommunityMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [me, setMe] = useState<MyRole | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const community = await apiFetch<{ id: string }>(`/api/v1/communities/${slug}`);
    setCommunityId(community.id);
    const list = await apiFetch<{ creatorId: string; data: Member[] }>(`/api/v1/communities/${community.id}/members`);
    setMembers(list.data);
    setCreatorId(list.creatorId);
    if (token) {
      const mine = await apiFetch<MyRole>(`/api/v1/communities/${community.id}/members/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(mine);
    }
  }, [slug, token]);

  useEffect(() => {
    load().catch(() => toast.error('Could not load members'));
  }, [load]);

  const act = async (userId: string, fn: () => Promise<unknown>, okMessage: string) => {
    setBusy(userId);
    try {
      await fn();
      toast.success(okMessage);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const setRole = (m: Member, role: 'MODERATOR' | 'MEMBER') =>
    communityId &&
    act(
      m.user.id,
      () =>
        apiFetch(`/api/v1/communities/${communityId}/members/${m.user.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }),
      role === 'MODERATOR' ? 'Made moderator' : 'Removed moderator role',
    );

  const remove = (m: Member) => {
    if (!communityId) return;
    if (!window.confirm(`Remove ${m.user.displayName} from this community?`)) return;
    act(
      m.user.id,
      () =>
        apiFetch(`/api/v1/communities/${communityId}/members/${m.user.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }),
      'Member removed',
    );
  };

  const btn = 'rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] disabled:opacity-50';

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href={`/c/${slug}`} className="text-sm text-[var(--primary)] hover:underline">← Back to community</Link>
      <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Members & roles</h1>

      <ul className="mt-6 divide-y divide-[var(--border)]">
        {members.map((m) => {
          const isCreatorRow = m.user.id === creatorId;
          const canEdit = me?.canManage && !isCreatorRow;
          const canRemove = !isCreatorRow && !!me && (me.canManage || (me.role === 'MODERATOR' && m.role === 'MEMBER'));
          return (
            <li key={m.user.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text)]">{m.user.displayName}</p>
                <p className="text-xs text-[var(--text-muted)]">@{m.user.username} · {m.role === 'MODERATOR' ? 'Moderator' : 'Member'}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {canEdit && m.role === 'MEMBER' && (
                  <button className={btn} disabled={busy === m.user.id} onClick={() => setRole(m, 'MODERATOR')}>Make moderator</button>
                )}
                {canEdit && m.role === 'MODERATOR' && (
                  <button className={btn} disabled={busy === m.user.id} onClick={() => setRole(m, 'MEMBER')}>Remove moderator</button>
                )}
                {canRemove && (
                  <button className={btn} disabled={busy === m.user.id} onClick={() => remove(m)}>Remove</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
