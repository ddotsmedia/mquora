'use client';

import { useState } from 'react';
import { UserPlus, X, Search, Loader2, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  username: string;
  displayName: string;
  isVerified?: boolean;
}

interface AskToAnswerProps {
  postId: string;
}

export function AskToAnswer({ postId }: AskToAnswerProps) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await apiFetch<{ data: User[] }>(`/api/v1/users/search?q=${encodeURIComponent(q)}&limit=8`, { headers: { Authorization: `Bearer ${token}` } });
      setResults(res.data ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await apiFetch(`/api/v1/questions/${postId}/request-answer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesteeId: selected.id, message: message.trim() || undefined }),
      });
      setSent(true);
      setTimeout(() => { setOpen(false); setSent(false); setSelected(null); setQuery(''); setMessage(''); }, 1500);
    } catch { /* already answered or network error */ }
    finally { setSending(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        aria-label="Ask someone to answer this question"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Ask to Answer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Ask someone to answer">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Ask someone to answer</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-[var(--surface-2)] transition-colors">
                <X className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>

            {!selected ? (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    placeholder="Search by name or username…"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-muted)]" />}
                </div>
                <ul className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                  {results.length === 0 && query.length >= 2 && !searching && (
                    <li className="px-4 py-3 text-sm text-[var(--text-muted)]">No users found</li>
                  )}
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => setSelected(u)}
                        className="w-full px-4 py-2.5 text-left hover:bg-[var(--primary)]/10 transition-colors"
                      >
                        <span className="font-medium text-sm text-[var(--text)]">{u.displayName}</span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">@{u.username}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
                  <div>
                    <span className="font-medium text-sm text-[var(--text)]">{selected.displayName}</span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">@{selected.username}</span>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Add a personal note <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why are you asking this person? (visible to them)"
                  rows={3}
                  maxLength={500}
                  className="mb-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] resize-none"
                />

                <button
                  onClick={send}
                  disabled={sending || sent}
                  className="w-full rounded-full bg-[var(--primary)] py-2 text-sm font-semibold text-white hover:bg-[var(--primary-light)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {sent ? (
                    <><Check className="h-4 w-4" /> Request sent!</>
                  ) : sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <>Send request</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
