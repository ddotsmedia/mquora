'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Extracts the slug from "https://…/q/<slug>", "/q/<slug>" or a bare slug.
function slugFrom(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  const match = trimmed.match(/\/q\/([^/?#]+)/);
  return decodeURIComponent(match ? match[1] : trimmed);
}

export function DuplicateReportButton({ postId }: { postId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const targetSeoSlug = slugFrom(value);
    if (!targetSeoSlug) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/posts/${postId}/duplicate-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSeoSlug }),
      });
      toast.success('Thanks. Admins will review this duplicate report.');
      setOpen(false);
      setValue('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send the report');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return null;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]">
        Report as duplicate
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Link to the original question"
        className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]"
        required
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded bg-[var(--primary)] px-3 py-1 text-sm text-white disabled:opacity-60">Send</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)]">Cancel</button>
      </div>
    </form>
  );
}
