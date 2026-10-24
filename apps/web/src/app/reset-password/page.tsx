import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { AuthCard, authButton, authInput } from '@/components/auth-card';

export const dynamic = 'force-dynamic';

async function resetPassword(formData: FormData) {
  'use server';
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=short`);
  if (password !== confirm) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);

  let ok = false;
  try {
    await serverApiFetch('/api/v1/auth/password-reset/confirm', undefined, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: password }),
      cache: 'no-store',
    });
    ok = true;
  } catch {
    ok = false;
  }
  // The token is removed from the URL on success, and the user is sent to log in with the new password.
  if (ok) redirect('/login?reset=1');
  redirect('/forgot-password?expired=1');
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  const token = sp.token ?? '';
  if (!token) {
    return (
      <AuthCard title="Reset link missing" subtitle="Request a new reset link to continue."
        footer={<Link href="/forgot-password" className="font-medium text-[var(--primary)] hover:underline">Request a new link</Link>}>
        <p className="text-sm text-[var(--text-secondary)]">This page needs the link from your email.</p>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Choose a new password"
      subtitle="At least 8 characters."
      footer={<Link href="/login" className="font-medium text-[var(--primary)] hover:underline">Back to log in</Link>}
    >
      {sp.error === 'short' && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">Password must be at least 8 characters.</div>}
      {sp.error === 'mismatch' && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">The passwords do not match.</div>}
      <form action={resetPassword} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="password" name="password" placeholder="New password" autoComplete="new-password" className={authInput} required minLength={8} />
        <input type="password" name="confirm" placeholder="Confirm new password" autoComplete="new-password" className={authInput} required minLength={8} />
        <button type="submit" className={authButton}>Set new password</button>
      </form>
    </AuthCard>
  );
}
