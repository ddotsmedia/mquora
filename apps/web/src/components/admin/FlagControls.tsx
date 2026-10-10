'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { setFlagAction } from '@/app/admin/actions';

export function FlagToggle({ flagKey, enabled, canEdit }: { flagKey: string; enabled: boolean; canEdit: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={!canEdit || pending}
      onClick={() => {
        const next = !on;
        startTransition(async () => {
          const res = await setFlagAction(flagKey, next);
          if (res.ok) {
            setOn(next);
            toast.success(res.message);
          } else toast.error(res.message);
        });
      }}
      aria-pressed={on}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-40 ${on ? 'bg-[var(--primary)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function NewFlagForm({ canEdit }: { canEdit: boolean }) {
  const [key, setKey] = useState('');
  const [pending, startTransition] = useTransition();
  if (!canEdit) return null;
  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const k = key.trim();
        if (!k) return;
        startTransition(async () => {
          const res = await setFlagAction(k, true);
          if (res.ok) {
            toast.success(`Flag "${k}" created and enabled`);
            setKey('');
          } else toast.error(res.message);
        });
      }}
    >
      <input
        value={key}
        onChange={(e) => setKey(e.target.value.toLowerCase())}
        placeholder="flag_key_name"
        className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
      />
      <button type="submit" disabled={pending || !key.trim()} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Saving…' : 'Add flag'}
      </button>
    </form>
  );
}
