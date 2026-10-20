import Link from 'next/link';
import type { ReactNode } from 'react';

export const authInput =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]';
export const authButton =
  'w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-light)]';

// Shared frame for login and register: brand panel + form card.
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#123D28] via-[#1F6B45] to-[#14482F] p-10 text-white md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#D4A017]/20 blur-3xl" />
          <Link href="/" className="relative text-lg font-bold">mquora</Link>
          <div className="relative">
            <p className="font-malayalam text-3xl font-bold leading-snug">അറിവ് പങ്കുവെക്കൂ</p>
            <p className="mt-3 text-sm text-white/70">Ask, answer and learn with Malayalis everywhere.</p>
          </div>
          <p className="relative text-xs text-white/50">Malayalam · English · Manglish</p>
        </div>
        <div className="p-8 md:p-10">
          <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">{footer}</p>
        </div>
      </div>
    </div>
  );
}
