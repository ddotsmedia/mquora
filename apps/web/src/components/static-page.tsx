import type { ReactNode } from 'react';

// Shared layout for simple content pages (About, Guidelines, Privacy, Terms).
export function StaticPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[var(--text)]">{title}</h1>
      {subtitle && <p className="mt-2 text-[var(--text-secondary)]">{subtitle}</p>}
      <div className="mt-8 space-y-6 leading-relaxed text-[var(--text)] [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
