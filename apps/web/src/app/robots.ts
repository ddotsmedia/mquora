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
      // AI answer engines that cite and link to sites (ChatGPT search, Perplexity) may read the public pages.
      {
        userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'],
        allow: ['/', '/q/', '/c/', '/t/', '/profile/', '/communities', '/tags', '/discover', '/leaderboard'],
        disallow: [
          '/admin/', '/api/', '/post-login',
          '/notifications', '/bookmarks', '/settings', '/me',
          '/drafts', '/for-you', '/following',
        ],
      },
      // Training crawlers stay blocked.
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
