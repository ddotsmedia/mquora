import type { MetadataRoute } from 'next';

// Plan §20: keep private, moderation and account pages out of search engines.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3022').replace(/\/api(\/v1)?\/?$/, '').replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/login', '/register', '/post-login', '/notifications', '/bookmarks', '/create', '/ask', '/settings', '/me'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
