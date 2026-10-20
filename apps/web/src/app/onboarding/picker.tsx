'use client';

import { useState, useTransition } from 'react';

type Item = { id: string; name: string; hint?: string };

const EMOJI: Record<string, string> = {
  kerala: '🌴', 'gulf-life': '🏙️', 'jobs-careers': '💼', 'health-ayurveda': '🌿', technology: '💻', education: '🎓',
  'money-business': '💰', 'food-recipes': '🍛', travel: '✈️', 'malayalam-language': '📖', 'movies-entertainment': '🎬', 'law-documents': '📜',
};

// Interest picker: communities (with emoji tiles) and topics (chips). Needs at least 3 picks.
export function InterestPicker({
  communities,
  topics,
  initialCommunities,
  initialTopics,
  save,
  skip,
}: {
  communities: (Item & { slug: string })[];
  topics: Item[];
  initialCommunities: string[];
  initialTopics: string[];
  save: (communityIds: string[], tagIds: string[]) => Promise<void>;
  skip: () => Promise<void>;
}) {
  const [cs, setCs] = useState(new Set(initialCommunities));
  const [ts, setTs] = useState(new Set(initialTopics));
  const [pending, start] = useTransition();
  const total = cs.size + ts.size;
  const flip = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  return (
    <div>
      {communities.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {communities.map((c) => {
            const on = cs.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => flip(cs, c.id, setCs)}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  on ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/30' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50'
                }`}
              >
                <span className="text-3xl">{EMOJI[c.slug] ?? '💬'}</span>
                <span className="mt-2 block font-semibold text-[var(--text)]">{c.name}</span>
                {c.hint && <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--text-muted)]">{c.hint}</span>}
                {on && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-white">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {topics.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-semibold text-[var(--text)]">Popular topics</h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => flip(ts, t.id, setTs)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${ts.has(t.id) ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)]'}`}
              >
                #{t.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg)]/95 py-4 backdrop-blur">
        <button type="button" disabled={pending} onClick={() => start(() => skip())} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          Skip for now
        </button>
        <button
          type="button"
          disabled={pending || total < 3}
          onClick={() => start(() => save([...cs], [...ts]))}
          className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:opacity-50"
        >
          {total < 3 ? `Pick ${3 - total} more` : pending ? 'Saving…' : `Continue (${total})`}
        </button>
      </div>
    </div>
  );
}
