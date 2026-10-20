import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';
import { AuthCard, authButton, authInput } from '@/components/auth-card';

export const dynamic = 'force-dynamic';

const API = process.env.API_INTERNAL_URL || 'http://localhost:3041';

// Server-side sign-up, then sign in. (The old client page imported server-only auth code.)
async function register(formData: FormData) {
  'use server';
  const field = (k: string) => String(formData.get(k) ?? '').trim();
  const email = field('email');
  const password = String(formData.get('password') ?? '');
  const res = await fetch(`${API}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: field('displayName'), username: field('username').toLowerCase() }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Registration failed';
    redirect(`/register?error=${encodeURIComponent(msg)}`);
  }
  try {
    await signIn('credentials', { email, password, redirectTo: '/post-login' });
  } catch (e) {
    if (e instanceof AuthError) redirect('/login?registered=1');
    throw e; // NEXT_REDIRECT on success
  }
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  if (session?.user?.accessToken && !session.error) redirect('/');

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join the Malayalam knowledge community."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">Log in</Link></>}
    >
      {sp.error && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{sp.error}</div>}
      <form action={register} className="space-y-4">
        <input name="displayName" placeholder="Your name" minLength={2} maxLength={100} autoComplete="name" className={authInput} required />
        <input name="username" placeholder="Username (letters, numbers, _)" minLength={2} maxLength={50} pattern="[A-Za-z0-9_]+" autoComplete="username" className={authInput} required />
        <input type="email" name="email" placeholder="Email" autoComplete="email" className={authInput} required />
        <input type="password" name="password" placeholder="Password (min 8 characters)" minLength={8} maxLength={100} autoComplete="new-password" className={authInput} required />
        <button type="submit" className={authButton}>Create account</button>
      </form>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        By joining you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/guidelines" className="underline">Guidelines</Link>.
      </p>
    </AuthCard>
  );
}
