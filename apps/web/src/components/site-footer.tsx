import Link from 'next/link';

const LINKS = [
  ['About', '/about'],
  ['Guidelines', '/guidelines'],
  ['Topics', '/tags'],
  ['Communities', '/communities'],
  ['Leaderboard', '/leaderboard'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--text)]">askvyo</p>
          <p className="text-sm text-[var(--text-muted)]">മലയാളത്തിൽ ചോദിക്കാം, പഠിക്കാം, പങ്കുവെക്കാം.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="text-[var(--text-secondary)] hover:text-[var(--primary)]">{label}</Link>
          ))}
        </nav>
      </div>
      <p className="pb-4 text-center text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} askvyo</p>
      <div className="border-t border-[var(--border)]">
        <p className="py-3 text-center text-xs text-[var(--text-muted)]">Built and managed by Ddotsmedia Technologies LLC</p>
      </div>
    </footer>
  );
}
