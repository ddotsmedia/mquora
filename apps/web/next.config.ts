import path from 'node:path';
import type { NextConfig } from 'next';

// Security headers (CSP, HSTS, etc.) are set per-request with a nonce in src/middleware.ts.
// next.config.ts no longer sets static headers to avoid a static CSP without nonces.

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Monorepo: trace dependencies from the repo root so standalone keeps workspace packages.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  poweredByHeader: false,
};

export default config;
