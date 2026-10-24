'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface Community {
  id: string;
  name: string;
  slug: string;
}

function ArticleFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCommunityId = searchParams.get('communityId');
  const { data: session, status } = useSession();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [communityId, setCommunityId] = useState(preselectedCommunityId || '');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    apiFetch<{ data: Community[] }>('/api/v1/communities?limit=50')
      .then((r) => {
        setCommunities(r.data || []);
        if (!communityId && r.data?.length) setCommunityId(r.data[0].id);
      })
      .catch(() => {});
  }, [status, router, communityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    if (body.trim().length < 100) {
      toast.error('Articles must be at least 100 characters');
      return;
    }
    setLoading(true);
    try {
      const token = session?.user?.accessToken;
      const res = await apiFetch<{ seoSlug: string }>('/api/v1/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          type: 'ARTICLE',
          communityId: communityId || undefined,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      toast.success('Article published!');
      router.push(`/q/${res.seoSlug}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish article');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--primary)]">New Article</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">Write an article</h1>
        <p className="mt-1 text-[var(--text-secondary)] text-sm">Share knowledge, stories, or insights with the community.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Community</label>
          <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} className={input}>
            <option value="">— General (no community) —</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title…"
            maxLength={300}
            required
            className={input}
          />
          <p className="mt-1 text-right text-xs text-[var(--text-muted)]">{title.length}/300</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Body <span className="text-red-500">*</span></label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your article here. You can use paragraphs, and write in Malayalam or English…"
            rows={16}
            required
            className={`${input} resize-y`}
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Minimum 100 characters · {body.length} typed</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Topics / tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. technology, kerala, health (comma-separated)"
            className={input}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim() || body.trim().length < 100}
            className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-light)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Publishing…' : 'Publish article'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateArticlePage() {
  return (
    <Suspense>
      <ArticleFormInner />
    </Suspense>
  );
}
