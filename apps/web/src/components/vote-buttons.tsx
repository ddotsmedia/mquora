'use client';

import { useState } from 'react';
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
        setScore(voteType === 'UP' ? score + 1 : score - 1);
      } else {
        await apiFetch(`/api/v1/votes/${targetId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken || session.user?.accessToken}` },
        });
        setScore(userVote === 'UP' ? score - 1 : score + 1);
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
        className={`p-2 rounded hover:bg-muted ${userVote === 'UP' ? 'bg-green-100 dark:bg-green-900' : ''}`}
      >
        <ThumbsUp size={16} />
      </button>
      <span className="text-sm font-semibold min-w-8">{score}</span>
      <button
        onClick={() => handleVote('DOWN')}
        className={`p-2 rounded hover:bg-muted ${userVote === 'DOWN' ? 'bg-red-100 dark:bg-red-900' : ''}`}
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
}
