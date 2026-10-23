import { MetadataRoute } from 'next';
import { serverApiFetch } from '@/lib/api';
import { siteOrigin } from '@/lib/site';

interface Post { id: string; seoSlug: string; createdAt: string; updatedAt?: string }
interface Community { id: string; slug: string; createdAt: string; updatedAt?: string }
interface Tag { id: string; slug: string; updatedAt?: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...['/communities', '/discover', '/leaderboard', '/tags', '/about', '/guidelines', '/privacy', '/terms'].map((p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  const postEntries: MetadataRoute.Sitemap = [];
  const communityEntries: MetadataRoute.Sitemap = [];
  const tagEntries: MetadataRoute.Sitemap = [];

  try {
    // Paginate posts — up to 500 entries
    let cursor: string | undefined;
    for (let i = 0; i < 5; i++) {
      const url = `/api/v1/posts?limit=100${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await serverApiFetch<{ data: Post[]; nextCursor: string | null }>(url);
      res.data.forEach((p) =>
        postEntries.push({
          url: `${base}/q/${p.seoSlug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt),
          changeFrequency: 'weekly',
          priority: 0.9,
        }),
      );
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }
  } catch {}

  try {
    const res = await serverApiFetch<{ data: Community[] }>('/api/v1/communities?limit=200');
    res.data.forEach((c) =>
      communityEntries.push({
        url: `${base}/c/${c.slug}`,
        lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(c.createdAt),
        changeFrequency: 'daily',
        priority: 0.7,
      }),
    );
  } catch {}

  try {
    const res = await serverApiFetch<{ data: Tag[] }>('/api/v1/tags?limit=200');
    res.data.forEach((t) =>
      tagEntries.push({
        url: `${base}/t/${t.slug}`,
        lastModified: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
      }),
    );
  } catch {}

  return [...staticPages, ...postEntries, ...communityEntries, ...tagEntries];
}
