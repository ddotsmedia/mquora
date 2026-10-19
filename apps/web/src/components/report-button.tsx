'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

const REASONS = ['Spam', 'Abusive or hateful', 'Misinformation', 'Off-topic', 'Other'];

// Report a question, answer or comment to the moderators.
export function ReportButton({ targetId, targetType }: { targetId: string; targetType: 'POST' | 'ANSWER' | 'COMMENT' }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (reason: string) => {
    try {
      await apiFetch('/api/v1/moderation/report', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId, targetType, reason }),
      });
      setDone(true);
      setOpen(false);
      toast.success('Thanks — moderators will review it');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send report');
    }
  };

  if (done) return <span className="text-xs text-[var(--text-muted)]">Reported</span>;

  return (
    <span className="relative">
      <button
        onClick={() => (token ? setOpen(!open) : (window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`))}
        className="text-xs text-[var(--text-muted)] hover:text-red-600"
      >
        ⚑ Report
      </button>
      {open && (
        <span className="absolute right-0 z-20 mt-1 flex w-48 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          {REASONS.map((r) => (
            <button key={r} onClick={() => submit(r)} className="rounded px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]">{r}</button>
          ))}
        </span>
      )}
    </span>
  );
}
