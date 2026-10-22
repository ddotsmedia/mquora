'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface AnswerVotingProps {
  answerId: string;
  initialVoteCount: number;
  initialUserVote?: 'UP' | 'DOWN' | null;
}

export function AnswerVoting({ answerId, initialVoteCount, initialUserVote }: AnswerVotingProps) {
  const { data: session } = useSession();
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState<'UP' | 'DOWN' | null>(initialUserVote ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (type: 'UP' | 'DOWN') => {
    if (!session?.user?.email) {
      // Show toast: Log in to vote
      alert('Log in to vote');
      return;
    }

    setIsLoading(true);
    try {
      if (userVote === type) {
        // Remove vote
        await fetch(`/api/v1/answers/${answerId}/vote`, { method: 'DELETE' });
        setUserVote(null);
        setVoteCount(userVote === 'UP' ? voteCount - 1 : voteCount + 1);
      } else {
        // Add or change vote
        const response = await fetch(`/api/v1/answers/${answerId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });
        const data = await response.json();
        setUserVote(type);
        setVoteCount(data.voteCount);
      }
    } catch (error) {
      console.error('Vote error:', error);
      alert('Failed to vote');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
      <button
        onClick={() => handleVote('UP')}
        disabled={isLoading}
        className={`p-1 rounded hover:bg-blue-500/10 transition-colors ${
          userVote === 'UP' ? 'text-blue-600 dark:text-blue-400' : ''
        } ${isLoading ? 'opacity-50' : ''}`}
        title="Upvote"
      >
        <ThumbsUp size={18} fill={userVote === 'UP' ? 'currentColor' : 'none'} />
      </button>
      <span className="font-semibold text-foreground">{voteCount}</span>
      <button
        onClick={() => handleVote('DOWN')}
        disabled={isLoading}
        className={`p-1 rounded hover:bg-red-500/10 transition-colors ${
          userVote === 'DOWN' ? 'text-red-600 dark:text-red-400' : ''
        } ${isLoading ? 'opacity-50' : ''}`}
        title="Downvote"
      >
        <ThumbsDown size={18} fill={userVote === 'DOWN' ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
