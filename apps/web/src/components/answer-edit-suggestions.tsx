'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

interface Suggestion {
  id: string;
  body: string;
  createdAt: string;
  suggestedBy: { username: string; displayName: string };
}

// Anyone signed in (other than the author) can propose an edit to an answer.
// The answer author, the question asker and admins see pending suggestions and decide.
export function AnswerEditSuggestions({ answerId, authorId, body }: { answerId: string; authorId: string; body: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.user?.accessToken;
  const userId = session?.user?.id;
  const isAuthor = !!userId && userId === authorId;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(body);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Suggestion[]>([]);

  const load = async () => {
    if (!token) return;
    try {
      const r = await apiFetch<{ data: Suggestion[] }>(`/api/v1/answers/${answerId}/edit-suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPending(r.data);
    } catch {
      setPending([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, answerId]);

  const submit = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/answers/${answerId}/edit-suggestions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: draft }),
      });
      toast.success('Thanks, your suggestion was sent to the author');
      setOpen(false);
      setDraft(body);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send suggestion');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (suggestionId: string, accept: boolean) => {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/answers/${answerId}/edit-suggestions/${suggestionId}/decide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accept }),
      });
      toast.success(accept ? 'Suggestion applied' : 'Suggestion rejected');
      await load();
      if (accept) router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update suggestion');
    } finally {
      setBusy(false);
    }
  };

  if (!session) return null;

  return (
    <div className="mt-3 space-y-3 text-sm">
      {!isAuthor && !open && (
        <button type="button" onClick={() => { setDraft(body); setOpen(true); }} className="text-muted-foreground underline-offset-4 hover:underline">
          Suggest an edit
        </button>
      )}

      {!isAuthor && open && (
        <div className="space-y-2 rounded-md border p-3">
          <label className="block text-xs font-medium text-muted-foreground" htmlFor={`suggest-${answerId}`}>
            Your suggested version. The author decides whether to apply it.
          </label>
          <textarea
            id={`suggest-${answerId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            maxLength={20000}
            className="w-full rounded-md border bg-background p-2"
          />
          <div className="flex gap-2">
            <button type="button" onClick={submit} disabled={busy || draft.trim().length < 2} className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50">
              Send suggestion
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="font-medium">Pending edit suggestions ({pending.length})</p>
          {pending.map((s) => (
            <div key={s.id} className="space-y-2 border-t pt-2 first:border-t-0 first:pt-0">
              <p className="text-xs text-muted-foreground">Suggested by {s.suggestedBy.displayName || s.suggestedBy.username}</p>
              <p className="whitespace-pre-wrap">{s.body}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => decide(s.id, true)} disabled={busy} className="rounded-md bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50">
                  Apply
                </button>
                <button type="button" onClick={() => decide(s.id, false)} disabled={busy} className="rounded-md border px-3 py-1 disabled:opacity-50">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
