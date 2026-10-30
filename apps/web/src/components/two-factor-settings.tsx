'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

type Setup = { secret: string; otpauthUrl: string };

const btn =
  'rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] disabled:opacity-50';
const input =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]';

export function TwoFactorSettings() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    if (!token) return;
    const s = await apiFetch<{ enabled: boolean }>('/api/v1/auth/2fa/status', { headers: { Authorization: `Bearer ${token}` } });
    setEnabled(s.enabled);
  }, [token]);

  useEffect(() => {
    load().catch(() => toast.error('Could not load two-factor status'));
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      const s = await apiFetch<Setup>('/api/v1/auth/2fa/setup', { method: 'POST', headers });
      setSetup(s);
      setCode('');
    });

  const enable = () =>
    run(async () => {
      const r = await apiFetch<{ enabled: boolean; backupCodes: string[] }>('/api/v1/auth/2fa/enable', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
      });
      setSetup(null);
      setCode('');
      setEnabled(true);
      setBackupCodes(r.backupCodes);
      toast.success('Two-factor sign-in is on');
    });

  const disable = () =>
    run(async () => {
      if (!window.confirm('Turn off two-factor sign-in? Your backup codes will stop working.')) return;
      await apiFetch('/api/v1/auth/2fa/disable', { method: 'POST', headers, body: JSON.stringify({ password, code }) });
      setEnabled(false);
      setPassword('');
      setCode('');
      toast.success('Two-factor sign-in is off');
    });

  if (enabled === null) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;

  return (
    <section className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Two-factor sign-in</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ask for a code from an authenticator app (such as Google Authenticator or Aegis) each time you log in with your password.
          Google sign-in is not affected.
        </p>
      </div>

      {backupCodes && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-[var(--text)]">Save these backup codes</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Each code works once if you lose your phone. They will not be shown again.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-[var(--text)]">
            {backupCodes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <button className={`${btn} mt-4`} onClick={() => setBackupCodes(null)}>I have saved them</button>
        </div>
      )}

      {!enabled && !setup && (
        <button className={btn} disabled={busy} onClick={startSetup}>Set up two-factor sign-in</button>
      )}

      {!enabled && setup && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">1. Add this account to your authenticator app</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Enter this key, or open the link on your phone.</p>
            <p className="mt-2 break-all rounded-lg bg-[var(--surface-2)] p-3 font-mono text-sm text-[var(--text)]">{setup.secret}</p>
            <a href={setup.otpauthUrl} className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline">Open in authenticator app</a>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">2. Enter the 6-digit code it shows</p>
            <input className={`${input} mt-2 max-w-xs`} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </div>
          <div className="flex gap-2">
            <button className={btn} disabled={busy || code.trim().length !== 6} onClick={enable}>Turn on</button>
            <button className={btn} disabled={busy} onClick={() => setSetup(null)}>Cancel</button>
          </div>
        </div>
      )}

      {enabled && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            disable();
          }}
        >
          <p className="text-sm font-medium text-[var(--text)]">Two-factor sign-in is on.</p>
          <p className="text-sm text-[var(--text-secondary)]">To turn it off, confirm your password and a current code.</p>
          <input className={input} type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className={input} inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator or backup code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className={btn} disabled={busy || !password || !code}>Turn off</button>
        </form>
      )}
    </section>
  );
}
