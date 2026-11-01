'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

type Referral = { code: string | null; credited: number; pending: number; cap: number; reputationPerReferral: number };

export default function ReferralsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [data, setData] = useState<Referral | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Referral>('/api/v1/users/me/referral', { headers: { Authorization: `Bearer ${token}` } })
      .then(setData)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Could not load your referral link'));
  }, [token]);

  if (!token) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="text-[var(--text-secondary)]">Log in to get your invite link. <Link href="/login" className="text-[var(--primary)] hover:underline">Log in</Link></p>
      </div>
    );
  }

  const link = data?.code ? `${window.location.origin}/register?ref=${data.code}` : '';
  const message = `Join me on askvyo, the Malayalam Q&A community: ${link}`;
  const btn = 'rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]';

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Invite friends</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        When someone signs up with your link and their account is approved, you get {data?.reputationPerReferral ?? 10} reputation.
        You can earn this for up to {data?.cap ?? 20} people.
      </p>

      {data && (
        <>
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="break-all font-mono text-sm text-[var(--text)]">{link}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={btn}
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'), () => toast.error('Could not copy'))}
              >
                Copy link
              </button>
              <a className={btn} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-2xl font-bold text-[var(--text)]">{data.credited}</p>
              <p className="text-xs text-[var(--text-muted)]">Approved</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-2xl font-bold text-[var(--text)]">{data.pending}</p>
              <p className="text-xs text-[var(--text-muted)]">Waiting for approval</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
