'use client';

import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Suggestion = { username: string; displayName: string };
type Query = { start: number; end: number; text: string } | null;

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  token?: string;
};

// A textarea that suggests usernames after "@". Picking one writes "@username " in place of the partial name.
export function MentionTextarea({ value, onChange, token, className, ...rest }: Props) {
  const [query, setQuery] = useState<Query>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const latest = useRef('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    const caret = e.target.selectionStart ?? e.target.value.length;
    const match = e.target.value.slice(0, caret).match(/(^|\s)@([A-Za-z0-9_]{1,50})$/);
    if (!match || !token) {
      setQuery(null);
      setSuggestions([]);
      return;
    }
    const text = match[2];
    const start = caret - text.length - 1;
    const next = { start, end: caret, text };
    setQuery(next);
    latest.current = text;
    apiFetch<{ data: Suggestion[] }>(`/api/v1/users/search?q=${encodeURIComponent(text)}&limit=6`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (latest.current === text) setSuggestions(r.data);
      })
      .catch(() => setSuggestions([]));
  };

  const pick = (user: Suggestion) => {
    if (!query) return;
    const next = `${value.slice(0, query.start)}@${user.username} ${value.slice(query.end)}`;
    onChange({ target: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>);
    setQuery(null);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <textarea
        {...rest}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery(null);
            setSuggestions([]);
          }
        }}
        className={className}
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-72 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {suggestions.map((u) => (
            <li key={u.username}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(u);
                }}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--surface-2)]"
              >
                <span className="text-sm font-medium text-[var(--text)]">{u.displayName}</span>
                <span className="text-xs text-[var(--text-muted)]">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
