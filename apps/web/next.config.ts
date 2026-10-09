import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Monorepo: trace dependencies from the repo root so standalone keeps workspace packages.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
};

export default config;
