import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'green',
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'green' | 'gold' | 'sky' | 'rose';
  delta?: number;
}) {
  const tones = {
    green: 'from-emerald-500/25 to-emerald-500/0 text-emerald-300',
    gold: 'from-amber-500/25 to-amber-500/0 text-amber-300',
    sky: 'from-sky-500/25 to-sky-500/0 text-sky-300',
    rose: 'from-rose-500/25 to-rose-500/0 text-rose-300',
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tones[tone]} opacity-60`} />
      <div className="relative flex items-start justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] ${tones[tone].split(' ').pop()}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="relative mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <div className="relative mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-1 ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? '+' : ''}
            {delta}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300',
  TEMP_BAN: 'bg-amber-500/15 text-amber-300',
  PERMANENT_BAN: 'bg-rose-500/15 text-rose-300',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300',
  REMOVED: 'bg-rose-500/15 text-rose-300',
  DRAFT: 'bg-slate-500/15 text-slate-300',
  DELETED: 'bg-slate-500/15 text-slate-300',
  PENDING: 'bg-amber-500/15 text-amber-300',
  UNDER_REVIEW: 'bg-sky-500/15 text-sky-300',
  RESOLVED: 'bg-slate-500/15 text-slate-300',
};

export function Badge({ value, className = '' }: { value: string; className?: string }) {
  const style = statusStyles[value] ?? 'bg-[var(--surface-2)] text-[var(--text-secondary)]';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style} ${className}`}>
      {value.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
    </div>
  );
}

export function DataTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            {head.map((h) => (
              <th key={h} className="px-3 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">{children}</tbody>
      </table>
    </div>
  );
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' });
}
