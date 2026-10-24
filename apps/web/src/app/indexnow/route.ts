import { NextResponse } from 'next/server';

/**
 * IndexNow requires: GET /{key}.txt → returns the key as plain text
 * We serve it at /indexnow and also generate a static file via next.config
 *
 * The actual key file is served via next.config.ts redirects or public/ folder.
 * This route handles the API key verification endpoint pattern.
 */
export async function GET() {
  const key = process.env.INDEXNOW_KEY || process.env.NEXT_PUBLIC_INDEXNOW_KEY;
  if (!key) {
    return new NextResponse('IndexNow not configured', { status: 404 });
  }
  return new NextResponse(key, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
