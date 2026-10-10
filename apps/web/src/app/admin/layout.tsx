import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import AdminNav from '@/components/admin/AdminNav';

const STAFF = ['ADMIN', 'COMMUNITY_MODERATOR'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !role || !STAFF.includes(role)) redirect('/login?callbackUrl=/admin/dashboard');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
        <Link href="/admin/dashboard" className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-emerald-600 font-bold text-white shadow-lg shadow-emerald-900/40">
            മ്
          </span>
          <span>
            <span className="block text-base font-semibold leading-tight">mquora</span>
            <span className="block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Admin console</span>
          </span>
        </Link>
        <AdminNav />
        <div className="border-t border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">Signed in as {session.user?.email}</div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 py-3 backdrop-blur md:px-8">
          <nav className="flex gap-3 overflow-x-auto text-sm md:hidden">
            <Link href="/admin/dashboard" className="whitespace-nowrap text-[var(--text-secondary)]">Dashboard</Link>
            <Link href="/admin/users" className="whitespace-nowrap text-[var(--text-secondary)]">Users</Link>
            <Link href="/admin/moderation" className="whitespace-nowrap text-[var(--text-secondary)]">Moderation</Link>
            <Link href="/admin/config" className="whitespace-nowrap text-[var(--text-secondary)]">Flags</Link>
          </nav>
          <div className="hidden text-sm text-[var(--text-secondary)] md:block">Malayalam-first community · Admin</div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)]">
              {role === 'ADMIN' ? 'Admin' : 'Moderator'}
            </span>
            <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">View site →</Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
