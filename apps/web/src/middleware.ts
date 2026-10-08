import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function middleware(req: NextRequest) {
  const session = await auth();

  if (
    (req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/settings') ||
      req.nextUrl.pathname.startsWith('/create')) &&
    !session
  ) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/create/:path*', '/login', '/register'],
};
