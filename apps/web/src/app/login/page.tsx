import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';
import { AuthCard, authButton, authDivider, authInput, GoogleSignInButton } from '@/components/auth-card';

// Server-side sign-in: no client JS, never cached, so stale browser bundles can't break login.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Same-site relative paths only. Browsers read "//host" and "/\host" both as protocol-relative, so reject both,
// along with control characters.
const safe = (cb?: string) =>
  cb && cb.startsWith('/') && !/^\/[\/\\]/.test(cb) && !/[\x00-\x1f\\]/.test(cb) ? cb : '';

async function login(formData: FormData) {
  'use server';
  const cb = safe(String(formData.get('callbackUrl') ?? ''));
  const q = cb ? `?callbackUrl=${encodeURIComponent(cb)}` : '';
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      totp: String(formData.get('totp') ?? ''),
      redirectTo: `/post-login${q}`,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      const causeMsg = (e.cause as { err?: { message?: string } } | undefined)?.err?.message;
      const suffix = cb ? `&callbackUrl=${encodeURIComponent(cb)}` : '';
      if (causeMsg === 'PENDING_APPROVAL') redirect(`/login?pending=1${suffix}`);
      if (causeMsg === 'TWO_FACTOR_REQUIRED') redirect(`/login?twofa=required${suffix}`);
      if (causeMsg === 'INVALID_TWO_FACTOR_CODE') redirect(`/login?twofa=invalid${suffix}`);
      redirect(`/login?error=1${cb ? `&callbackUrl=${encodeURIComponent(cb)}` : ''}`);
    }
    throw e; // NEXT_REDIRECT on success
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; expired?: string; registered?: string; pending?: string; reset?: string; twofa?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const cb = safe(sp.callbackUrl);
  const session = await auth();
  // A session without a usable API token (expired/refresh failed) must log in again, not loop.
  if (!sp.expired && session?.user?.accessToken && !session.error) redirect(`/post-login${cb ? `?callbackUrl=${encodeURIComponent(cb)}` : ''}`);

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to ask, answer and vote."
      footer={<>Don&apos;t have an account? <Link href="/register" className="font-medium text-[var(--primary)] hover:underline">Create one</Link></>}
    >
      {sp.error && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">Invalid email or password</div>}
      {sp.twofa === 'required' && <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">Enter the 6-digit code from your authenticator app, or a backup code.</div>}
      {sp.twofa === 'invalid' && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">That code is not correct. Try the next code from your app.</div>}
      {sp.pending && <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">Your account is awaiting admin approval. Please check back soon.</div>}
      {sp.expired && !sp.error && <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">Your session expired. Please log in again.</div>}
      {sp.registered && <div className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-700">Account created. Please log in.</div>}
      {sp.reset && <div className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-700">Password updated. Log in with your new password.</div>}
      <GoogleSignInButton callbackUrl={cb || undefined} />
      {authDivider}
      <form action={login} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={cb} />
        <input type="email" name="email" placeholder="Email" autoComplete="username" className={authInput} required />
        <input type="password" name="password" placeholder="Password" autoComplete="current-password" className={authInput} required />
        <input type="text" name="totp" inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator code (only if 2FA is on)" className={authInput} />
        <button type="submit" className={authButton}>Log in</button>
      </form>
      <p className="mt-4 text-center text-sm"><Link href="/forgot-password" className="text-[var(--primary)] hover:underline">Forgot password?</Link></p>
    </AuthCard>
  );
}
