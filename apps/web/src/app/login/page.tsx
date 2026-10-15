import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';

// Server-side sign-in: no client JS, never cached, so stale browser bundles can't break login.
export const dynamic = 'force-dynamic';

const safe = (cb?: string) => (cb && cb.startsWith('/') && !cb.startsWith('//') ? cb : '');

async function login(formData: FormData) {
  'use server';
  const cb = safe(String(formData.get('callbackUrl') ?? ''));
  const q = cb ? `?callbackUrl=${encodeURIComponent(cb)}` : '';
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: `/post-login${q}`,
    });
  } catch (e) {
    if (e instanceof AuthError) redirect(`/login?error=1${cb ? `&callbackUrl=${encodeURIComponent(cb)}` : ''}`);
    throw e; // NEXT_REDIRECT on success
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const cb = safe(sp.callbackUrl);
  if (await auth()) redirect(`/post-login${cb ? `?callbackUrl=${encodeURIComponent(cb)}` : ''}`);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        {sp.error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">Invalid email or password</div>}
        <form action={login} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={cb} />
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="username"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button type="submit" className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Login
          </button>
        </form>
        <p className="mt-4 text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
