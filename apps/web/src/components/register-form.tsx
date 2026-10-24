'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authInput, authButton } from './auth-card';
import { TurnstileWidget } from './turnstile-widget';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => { body[k] = String(v); });

    try {
      const res = await fetch(`${API}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Registration failed';
        setError(msg);
      } else {
        router.push('/register?pending=1');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
      <input name="displayName" placeholder="Your name" minLength={2} maxLength={100} autoComplete="name" className={authInput} required />
      <input name="username" placeholder="Username (letters, numbers, _)" minLength={2} maxLength={50} pattern="[A-Za-z0-9_]+" autoComplete="username" className={authInput} required />
      <input type="email" name="email" placeholder="Email" autoComplete="email" className={authInput} required />
      <input type="password" name="password" placeholder="Password (min 8 characters)" minLength={8} maxLength={100} autoComplete="new-password" className={authInput} required />
      <TurnstileWidget name="cf-turnstile-response" />
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
