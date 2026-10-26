import path from 'node:path';
import type { NextConfig } from 'next';

const analyticsOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_UMAMI_URL ? new URL(process.env.NEXT_PUBLIC_UMAMI_URL).origin : '';
  } catch {
    return '';
  }
})();

const apiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : '';
  } catch {
    return '';
  }
})();

const csp = [
  "default-src 'self'",
  // Next.js inlines its runtime and JSON-LD scripts, so inline scripts are allowed without nonces.
  `script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://challenges.cloudflare.com ${analyticsOrigin}`.trim(),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Allowlisted image origins: own domain, data/blob URIs, Google/GitHub avatars.
  // Avoid broad 'https:' which permits third-party tracking pixels.
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://secure.gravatar.com",
  `connect-src 'self' https://accounts.google.com https://challenges.cloudflare.com ${apiOrigin} ${analyticsOrigin}`.trim(),
  'frame-src https://accounts.google.com https://challenges.cloudflare.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Monorepo: trace dependencies from the repo root so standalone keeps workspace packages.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default config;
