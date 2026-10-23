'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { signIn } from 'next-auth/react';

export function GoogleSignInButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: callbackUrl || '/post-login' })}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-hover)]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  );
}

export const authDivider = (
  <div className="relative my-5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
    <span className="flex-1 border-t border-[var(--border)]" />
    <span>or</span>
    <span className="flex-1 border-t border-[var(--border)]" />
  </div>
);

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
          <Link href="/" className="relative text-lg font-bold">askvyo</Link>
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
