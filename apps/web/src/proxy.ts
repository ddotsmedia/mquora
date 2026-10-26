import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function proxy(req: NextRequest) {
  const session = await auth();

  if (
    (req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/settings') ||
      req.nextUrl.pathname.startsWith('/create')) &&
    !session
  ) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  // CSP nonce — generated per request for strict-dynamic support
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const analyticsOrigin = (() => {
    try {
      return process.env.NEXT_PUBLIC_UMAMI_URL ? new URL(process.env.NEXT_PUBLIC_UMAMI_URL).origin : '';
    } catch { return ''; }
  })();

  const apiOrigin = (() => {
    try {
      return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : '';
    } catch { return ''; }
  })();

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com https://challenges.cloudflare.com ${analyticsOrigin}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://secure.gravatar.com",
    `connect-src 'self' https://accounts.google.com https://challenges.cloudflare.com ${apiOrigin} ${analyticsOrigin}`.trim(),
    'frame-src https://accounts.google.com https://challenges.cloudflare.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "object-src 'none'",
  ].join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/settings/:path*', '/create/:path*', '/login', '/register',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
