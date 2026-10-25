'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

// Opt-in switch for the weekly digest email. Off by default.
export function DigestToggle() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ optIn: boolean }>('/api/v1/digest/preference', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setOptIn(r.optIn))
      .catch(() => setOptIn(false));
  }, [token]);

  const toggle = async () => {
    if (!token || optIn === null) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ optIn: boolean }>('/api/v1/digest/preference', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ optIn: !optIn }),
      });
      setOptIn(r.optIn);
      toast.success(r.optIn ? 'Weekly digest turned on' : 'Weekly digest turned off');
    } catch {
      toast.error('Could not update. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-sm font-medium text-[var(--text)]">Weekly digest email</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Top questions on askvyo, once a week. Off by default.</p>
      <button
        onClick={toggle}
        disabled={busy || optIn === null}
        className="mt-3 rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        {optIn ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  );
}
