'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { LanguageBadge } from '@/components/language-badge';

interface Community {
  id: string;
  name: string;
  slug: string;
}

export default function AskPage() {
  const router = useRouter();
  const { status } = useSession();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('ENGLISH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    const fetchCommunities = async () => {
      try {
        const res = await apiFetch<{ data: Community[] }>('/api/v1/communities?limit=50');
        setCommunities(res.data || []);
        if (res.data && res.data.length > 0) {
          setCommunityId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch communities:', err);
      }
    };

    fetchCommunities();
  }, [status, router]);

  const detectLanguage = (text: string) => {
    if (!text) return 'ENGLISH';
    const malayalamRegex = /[ഀ-ൿ]/g;
    const englishRegex = /[a-zA-Z]/g;
    const malayalamMatches = text.match(malayalamRegex) || [];
    const englishMatches = text.match(englishRegex) || [];

    if (malayalamMatches.length > 0 && englishMatches.length > 0) return 'MIXED';
    if (malayalamMatches.length > englishMatches.length) return 'MALAYALAM';
    return 'ENGLISH';
  };

  useEffect(() => {
    setLanguage(detectLanguage(title));
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await apiFetch<{ id: string; seoSlug: string }>('/api/v1/posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          communityId,
          tags: tagArray,
        }),
      });

      if (res.seoSlug) {
        router.push(`/q/${res.seoSlug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="h-8 bg-muted rounded animate-pulse mb-4"></div>
        <div className="space-y-4">
          <div className="h-12 bg-muted rounded animate-pulse"></div>
          <div className="h-32 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">നിങ്ങളുടെ ചോദ്യം ചോദിക്കൂ</h1>
        <p className="text-muted-foreground mb-8">Share your question and get answers from the community</p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">ചോദ്യം</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="നിങ്ങളുടെ ചോദ്യം ഇവിടെ എഴുതൂ..."
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Detected language:</span>
              <LanguageBadge language={language} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Community</label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a community</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Details (optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more details about your question..."
              rows={8}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-2">Markdown formatting is supported</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="javascript, react, debugging"
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-2">Add relevant tags to help others find your question</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'ചോദ്യം സൃഷ്ടിക്കുന്നത്...' : 'ചോദ്യം പോസ്റ്റ് ചെയ്യൂ'}
          </button>
        </form>
      </div>
    </div>
  );
}
