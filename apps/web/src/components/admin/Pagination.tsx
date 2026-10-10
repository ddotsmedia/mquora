import Link from 'next/link';

export default function Pagination({
  basePath,
  params,
  page,
  limit,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  limit: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const btn = 'rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm';

  return (
    <div className="flex items-center justify-between pt-4 text-sm text-[var(--text-secondary)]">
      <span>
        Page {page} of {pages} · {total.toLocaleString()} total
      </span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className={`${btn} hover:bg-[var(--surface-2)]`}>Previous</Link> : <span className={`${btn} opacity-40`}>Previous</span>}
        {page < pages ? <Link href={href(page + 1)} className={`${btn} hover:bg-[var(--surface-2)]`}>Next</Link> : <span className={`${btn} opacity-40`}>Next</span>}
      </div>
    </div>
  );
}
