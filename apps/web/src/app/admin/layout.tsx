'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MODERATOR')) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-[var(--surface)] border-r border-[var(--border)] flex-col">
          <div className="p-4 border-b border-[var(--border)]">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm font-malayalam">മ്</span>
              </div>
              <span className="font-bold text-lg text-[var(--primary)]">Admin</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-8">
            <NavSection title="Overview">
              <NavLink href="/admin/dashboard" label="Dashboard" />
              <NavLink href="/admin/analytics" label="Analytics" />
            </NavSection>

            <NavSection title="Community">
              <NavLink href="/admin/users" label="Users" />
              <NavLink href="/admin/content" label="Content" />
              <NavLink href="/admin/communities" label="Communities" />
            </NavSection>

            <NavSection title="System">
              <NavLink href="/admin/moderation" label="Moderation" />
              <NavLink href="/admin/ai" label="AI & Queues" />
              <NavLink href="/admin/config" label="Config" />
            </NavSection>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="md:ml-60 w-full">
          {/* Topbar */}
          <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-[var(--text)]">Admin Panel</h1>
              <div className="text-sm text-[var(--text-secondary)]">{session.user?.email}</div>
            </div>
          </header>

          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-all"
    >
      {label}
    </Link>
  );
}
