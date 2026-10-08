import { MetadataRoute } from 'next';
import { serverApiFetch } from '@/lib/api';

interface Post {
  id: string;
  seoSlug: string;
  createdAt: string;
}

interface Community {
  id: string;
  slug: string;
  createdAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '')
    : 'http://localhost:3022';

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/c`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  try {
    const postsResponse = await serverApiFetch<{
      data: Post[];
      nextCursor: string | null;
    }>('/api/v1/posts?limit=100');

    postsResponse.data.forEach((post) => {
      entries.push({
        url: `${baseUrl}/q/${post.seoSlug}`,
        lastModified: new Date(post.createdAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error('Failed to fetch posts for sitemap:', error);
  }

  try {
    const communitiesResponse = await serverApiFetch<{
      data: Community[];
      nextCursor: string | null;
    }>('/api/v1/communities?limit=100');

    communitiesResponse.data.forEach((community) => {
      entries.push({
        url: `${baseUrl}/c/${community.slug}`,
        lastModified: new Date(community.createdAt),
        changeFrequency: 'daily',
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error('Failed to fetch communities for sitemap:', error);
  }

  return entries;
}
