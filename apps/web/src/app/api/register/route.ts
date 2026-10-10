// Proxies sign-up to the API so the browser never calls the API origin directly (no CORS needed).
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3024')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
