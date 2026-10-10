import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// NEXT_PUBLIC_API_URL may be the origin or the origin plus /api/v1; normalise to origin.
const ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3024')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

type Query = Record<string, string | number | undefined | null>;

// Server-only client for the admin API. Uses the signed-in user's access token.
// On 401 (expired or banned session) the user is sent to log in again.
export async function adminFetch<T>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; query?: Query } = {},
): Promise<T> {
  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token) redirect('/login?callbackUrl=/admin/dashboard');

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${ORIGIN}/api/v1/admin${path}${qs}`, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 401) redirect('/login?callbackUrl=/admin/dashboard');

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new AdminApiError(res.status, message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}
