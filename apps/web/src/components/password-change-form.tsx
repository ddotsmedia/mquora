'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, ApiError } from '@/lib/api';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const input =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]';

function PasswordInput({
  name,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
        className={`${input} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PasswordChangeForm() {
  const { data: session } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const mismatch = next && confirm && next !== confirm;
  const weak = next && next.length < 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || weak || !current || !next) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/v1/users/me/password', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <p className="font-semibold text-green-700 dark:text-green-400">Password changed!</p>
        <p className="text-sm text-[var(--text-secondary)]">Your new password is active. Use it on your next sign-in.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-2 text-sm text-[var(--primary)] hover:underline"
        >
          Change it again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="font-semibold text-[var(--text)]">Change password</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Only available for accounts with a password. Social login accounts (Google, etc.) cannot set a password here.
      </p>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text)]">Current password</span>
        <PasswordInput name="currentPassword" placeholder="••••••••" value={current} onChange={setCurrent} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text)]">New password</span>
        <PasswordInput name="newPassword" placeholder="At least 8 characters" value={next} onChange={setNext} />
        {weak && <p className="mt-1 text-xs text-red-500">Password must be at least 8 characters</p>}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text)]">Confirm new password</span>
        <PasswordInput name="confirmPassword" placeholder="Repeat new password" value={confirm} onChange={setConfirm} />
        {mismatch && <p className="mt-1 text-xs text-red-500">Passwords do not match</p>}
      </label>

      <button
        type="submit"
        disabled={busy || !!mismatch || !!weak || !current || !next || !confirm}
        className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
