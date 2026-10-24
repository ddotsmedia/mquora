import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
// redirect is used for the session check below
import { AuthCard, authDivider, GoogleSignInButton } from '@/components/auth-card';
import { RegisterForm } from '@/components/register-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
      <RegisterForm />
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        By joining you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/guidelines" className="underline">Guidelines</Link>.
      </p>
    </AuthCard>
  );
}
