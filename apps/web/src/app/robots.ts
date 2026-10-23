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
          '/admin/', '/api/', '/login', '/register', '/post-login',
          '/notifications', '/bookmarks', '/ask', '/settings', '/me',
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
