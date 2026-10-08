'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { apiFetch, ApiError } from '@/lib/api';
import { toast } from 'sonner';

interface Community {
  id: string;
  name: string;
  slug: string;
}

export default function CreatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('QUESTION');
  const [communityId, setCommunityId] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const response = await apiFetch<{ data: Community[] }>('/api/v1/communities?limit=100');
        setCommunities(response.data);
        if (response.data.length > 0) {
          setCommunityId(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch communities:', error);
      }
    };
    fetchCommunities();
  }, []);

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Sign in to create a post</h1>
        <button
          onClick={() => signIn()}
          className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.length < 10) {
      toast.error('Title must be at least 10 characters');
      return;
    }

    if (!body.trim() || body.length < 20) {
      toast.error('Body must be at least 20 characters');
      return;
    }

    if (!communityId) {
      toast.error('Please select a community');
      return;
    }

    setLoading(true);
    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);

      const response = await apiFetch<{ id: string; seoSlug: string }>('/api/v1/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.user?.accessToken}` },
        body: JSON.stringify({
          title,
          body,
          type,
          communityId,
          tags: tagArray.slice(0, 5),
        }),
      });

      toast.success('Post created successfully');
      router.push(`/q/${response.seoSlug}`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create post');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Create a New Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your question or topic?"
            className="w-full px-4 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground mt-1">{title.length} / 200</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Provide more details..."
            className="w-full px-4 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            rows={8}
          />
          <p className="text-xs text-muted-foreground mt-1">{body.length} / 5000</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="QUESTION">Question</option>
              <option value="DISCUSSION">Discussion</option>
              <option value="ARTICLE">Article</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Community</label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full px-4 py-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select a community</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Tags (comma-separated, max 5)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. typescript, react, web-development"
            className="w-full px-4 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 font-semibold"
        >
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
}
