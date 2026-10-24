import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = siteOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/q/', '/c/', '/t/', '/profile/', '/communities', '/tags', '/discover', '/leaderboard'],
        disallow: [
          '/admin/', '/api/', '/post-login',
          '/notifications', '/bookmarks', '/settings', '/me',
          '/drafts', '/for-you', '/following',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
