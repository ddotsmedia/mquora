'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, ApiError } from '@/lib/api';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

interface VoteButtonsProps {
  targetId: string;
  targetType: 'POST' | 'ANSWER' | 'COMMENT';
  initialScore: number;
  accessToken?: string;
}

export function VoteButtons({ targetId, targetType, initialScore, accessToken }: VoteButtonsProps) {
  const { data: session } = useSession();
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<'UP' | 'DOWN' | null>(null);
  const token = accessToken || session?.user?.accessToken;

  useEffect(() => {
    if (!token) return;
    apiFetch<{ votes: Record<string, 'UP' | 'DOWN'> }>(`/api/v1/votes/mine?ids=${targetId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setUserVote(r.votes[targetId] ?? null))
      .catch(() => undefined);
  }, [token, targetId]);

  const value = (v: 'UP' | 'DOWN' | null) => (v === 'UP' ? 1 : v === 'DOWN' ? -1 : 0);

  const handleVote = async (voteType: 'UP' | 'DOWN') => {
    if (!session) {
      toast.error('Please sign in to vote');
      return;
    }

    try {
      const newVote = userVote === voteType ? null : voteType;

      if (newVote) {
        await apiFetch('/api/v1/votes', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken || session.user?.accessToken}` },
          body: JSON.stringify({ targetId, targetType, voteType }),
        });
        setScore(score - value(userVote) + value(voteType));
      } else {
        await apiFetch(`/api/v1/votes/${targetType}/${targetId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken || session.user?.accessToken}` },
        });
        setScore(score - value(userVote));
      }

      setUserVote(newVote);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to vote');
      }
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleVote('UP')}
        className={`p-2 rounded hover:bg-[var(--surface-2)] ${userVote === 'UP' ? 'bg-green-100 dark:bg-green-900' : ''}`}
      >
        <ThumbsUp size={16} />
      </button>
      <span className="text-sm font-semibold min-w-8">{score}</span>
      <button
        onClick={() => handleVote('DOWN')}
        className={`p-2 rounded hover:bg-[var(--surface-2)] ${userVote === 'DOWN' ? 'bg-red-100 dark:bg-red-900' : ''}`}
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
}
