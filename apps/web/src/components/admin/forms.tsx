'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/app/admin/actions';

// Shared form primitives for admin create/edit forms.
export const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}

// Latin-only slug; Malayalam names need a slug typed by hand.
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 50);
}

// Runs a server action with pending state + toast; calls onOk on success.
export function useSubmit() {
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message);
        onOk?.();
      } else toast.error(res.message);
    });
  return { pending, submit };
}

export function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
    >
      {pending ? 'Working…' : label}
    </button>
  );
}
