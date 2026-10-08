'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { apiFetch, ApiError } from '@/lib/api';
import { toast } from 'sonner';

interface AnswerFormProps {
  postId: string;
  accessToken?: string;
}

export function AnswerForm({ postId, accessToken }: AnswerFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error('Please sign in to answer');
      signIn();
      return;
    }

    if (!body.trim()) {
      toast.error('Answer cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/v1/posts/${postId}/answers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken || session.user?.accessToken}` },
        body: JSON.stringify({ body }),
      });

      toast.success('Answer posted successfully');
      setBody('');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to post answer');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="p-4 border border-border rounded-lg text-center">
        <p className="text-muted-foreground mb-4">Sign in to answer this question</p>
        <button
          onClick={() => signIn()}
          className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your answer..."
        className="w-full px-4 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        rows={6}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? 'Posting...' : 'Post Answer'}
      </button>
    </form>
  );
}
