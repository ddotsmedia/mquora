import { auth } from '@/auth';

// Streams the users CSV from the API with the admin's token (browser never sees the token).
export const dynamic = 'force-dynamic';

const ORIGIN = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3024')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');

export async function GET() {
  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token || session?.user?.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  const res = await fetch(`${ORIGIN}/api/v1/admin/users/export`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) return new Response(`Export failed (${res.status})`, { status: res.status });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mquora-users-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
