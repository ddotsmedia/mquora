'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/app/admin/actions';

type Props = {
  label: string;
  run: () => Promise<ActionResult>;
  confirm?: string;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
};

const variants = {
  primary: 'bg-[var(--primary)] text-white hover:brightness-110',
  danger: 'bg-red-600/90 text-white hover:bg-red-600',
  ghost: 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]',
};

export default function ActionButton({ label, run, confirm, variant = 'ghost', disabled, className = '' }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          const res = await run();
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
        });
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {pending ? 'Working…' : label}
    </button>
  );
}
