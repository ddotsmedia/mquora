import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError, serverApiFetch } from '@/lib/api';
import { AuthCard, authButton, authInput } from '@/components/auth-card';

export const dynamic = 'force-dynamic';

async function requestReset(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  let invalid = false;
  try {
    await serverApiFetch('/api/v1/auth/password-reset/request', undefined, {
      method: 'POST',
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
  } catch (error) {
    // Only input problems are reported. Every other outcome shows the same "sent" message.
    invalid = error instanceof ApiError && error.status === 400;
  }
  redirect(invalid ? '/forgot-password?error=1' : '/forgot-password?sent=1');
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; expired?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email you signed up with. We'll send a reset link."
      footer={<>Remembered it? <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">Back to log in</Link></>}
    >
      {sp.sent && (
        <div className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-700">
          If an account exists for that email, a reset link is on its way. The link expires in 30 minutes.
        </div>
      )}
      {sp.expired && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">That reset link is invalid or has expired. Request a new one.</div>}
      {sp.error && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">Please enter a valid email address.</div>}
      <form action={requestReset} className="space-y-4">
        <input type="email" name="email" placeholder="Email" autoComplete="email" className={authInput} required />
        <button type="submit" className={authButton}>Send reset link</button>
      </form>
    </AuthCard>
  );
}
