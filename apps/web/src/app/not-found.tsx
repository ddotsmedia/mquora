import Link from 'next/link';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        {/* Large decorative 404 */}
        <div className="relative mb-6 select-none">
          <p className="text-[8rem] font-black text-[var(--primary)]/10 leading-none tracking-tight">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-6 py-3 shadow-sm">
              <p className="text-2xl font-bold text-[var(--text)]">കണ്ടെത്താനായില്ല</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Page Not Found</p>
            </div>
          </div>
        </div>

        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
          This page doesn&apos;t exist or may have been removed. Try searching for what you need.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Search className="h-4 w-4" />
            Discover Questions
          </Link>
        </div>

        <p className="mt-8 text-xs text-[var(--text-muted)]">
          Lost? Try the{' '}
          <Link href="/communities" className="text-[var(--primary)] hover:underline">
            communities
          </Link>{' '}
          or{' '}
          <Link href="/leaderboard" className="text-[var(--primary)] hover:underline">
            leaderboard
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
