'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { sections } from './AdminNav';

type Item = { label: string; group: string; href: string; icon: LucideIcon; external?: boolean };

const extras: Item[] = [
  { label: 'Export users (CSV)', group: 'Actions', href: '/admin/export/users', icon: Download, external: true },
  { label: 'View public site', group: 'Actions', href: '/', icon: ExternalLink },
];

// Ctrl/⌘+K quick switcher for admin pages and common actions.
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(
    () => [...sections.flatMap((s) => s.items.map((i) => ({ ...i, group: s.title }))), ...extras],
    [],
  );
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(t)) : items;
  }, [q, items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const go = (item?: Item) => {
    if (!item) return;
    setOpen(false);
    if (item.external) window.location.assign(item.href);
    else router.push(item.href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] md:inline-flex"
      >
        <Search className="h-4 w-4" /> Jump to…
        <kbd className="rounded border border-[var(--border)] px-1.5 text-[10px]">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, results.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === 'Enter') go(results[active]);
                }}
                placeholder="Go to page or action…"
                className="w-full bg-transparent py-3.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">No matches</li>}
              {results.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                        i === active ? 'bg-[var(--primary)]/20 text-[var(--text)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{item.group}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
