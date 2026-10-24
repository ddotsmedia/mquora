'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

// Keep in sync with REPORT_REASONS in moderation.controller.ts.
const REPORT_REASONS = ['Spam', 'Abusive or hateful', 'Misinformation', 'Off-topic', 'Dangerous or illegal', 'Other'];

// "Report to admin" for a question, answer or comment. Members pick a reason, optionally add details,
// and the report goes to the moderation queue, where admins are alerted.
export function ReportButton({ targetId, targetType }: { targetId: string; targetType: 'POST' | 'ANSWER' | 'COMMENT' }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  const close = () => {
    setOpen(false);
    setReason(null);
    setDetails('');
  };

  // Close on Escape or a click outside the panel.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setReason(null);
        setDetails('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setReason(null);
        setDetails('');
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      await apiFetch('/api/v1/moderation/report', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId, targetType, reason, details: details.trim() || undefined }),
      });
      setDone(true);
      close();
      toast.success('Sent to admin. Thank you for helping keep the community safe.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send report');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <span role="status" className="text-xs text-[var(--text-muted)]">
        ✓ Reported to admin
      </span>
    );
  }

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!token) {
            window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
            return;
          }
          if (open) close();
          else setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[var(--primary)] rounded"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Report to admin
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Report to admin"
          className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-lg"
        >
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Why are you reporting this?</p>
          <div role="radiogroup" aria-label="Reason" className="flex flex-col gap-1">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={`rounded-lg px-3 py-1.5 text-left text-sm transition ${
                  reason === r
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Add details (optional)"
            aria-label="Details"
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">
              Cancel
            </button>
            <button
              type="button"
              disabled={!reason || sending}
              onClick={submit}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send to admin'}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
