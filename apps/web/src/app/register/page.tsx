import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthCard, authButton, authDivider, authInput, GoogleSignInButton } from '@/components/auth-card';

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
  // Registration now requires admin approval before login is possible.
  redirect('/register?pending=1');
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; pending?: string }> }) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  if (session?.user?.accessToken && !session.error) redirect('/');

  if (sp.pending) {
    return (
      <AuthCard
        title="Registration submitted"
        subtitle="Your account is awaiting admin approval."
        footer={<><Link href="/login" className="font-medium text-[var(--primary)] hover:underline">Back to login</Link></>}
      >
        <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <p className="font-semibold mb-1">Thank you for registering!</p>
          <p>An admin will review your account shortly. You'll be able to log in once approved.</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join the Malayalam knowledge community."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">Log in</Link></>}
    >
      {sp.error && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{sp.error}</div>}
      <GoogleSignInButton />
      {authDivider}
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
