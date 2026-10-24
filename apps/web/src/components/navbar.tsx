'use client';

import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { NotificationBell } from './notification-bell';
import { LanguageToggle } from '@/lib/i18n';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Moon, Sun, Search, Plus } from 'lucide-react';

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-all ${
        active
          ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-10 h-10 rounded-full bg-[var(--surface-2)] hover:bg-[var(--border)] flex items-center justify-center transition-colors"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isStaff = ['ADMIN', 'COMMUNITY_MODERATOR'].includes(session?.user?.role ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    ...(session ? [
      { href: '/following', label: 'Following' },
      { href: '/answer', label: 'Answers' },
    ] : []),
    { href: '/communities', label: 'Communities' },
    { href: '/discover', label: 'Discover' },
    { href: '/tags', label: 'Topics' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white font-bold text-sm font-malayalam">മ്</span>
          </div>
          <span className="font-bold text-lg text-[var(--primary)]">askvyo</span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <form action="/search" role="search">
              <input
                type="search"
                name="q"
                placeholder="Search questions..."
                aria-label="Search questions"
                className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-full outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              />
            </form>
          </div>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} active={pathname === item.href}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <NotificationBell />
          <LanguageToggle className="hidden md:flex" />
          <ThemeToggle />
          <Link
            href="/ask"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[#17231C] font-semibold text-sm rounded-full transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ask
          </Link>

          {session ? (
            <div className="hidden sm:flex items-center gap-3">
              {isStaff && (
                <Link href="/admin/dashboard" className="text-sm font-medium text-[var(--primary)] hover:underline">
                  Admin
                </Link>
              )}
              <Link href="/drafts" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
                Drafts
              </Link>
              <Link href="/bookmarks" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
                Saved
              </Link>
              <Link href="/settings" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
                Settings
              </Link>
              <Link
                href="/me"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
              >
                {session.user?.name}
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-semibold rounded-full transition-all"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile search icon */}
          <Link href="/search" className="sm:hidden p-2.5 rounded-full hover:bg-[var(--surface-2)] transition-colors" aria-label="Search">
            <Search size={20} />
          </Link>

          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 rounded-full hover:bg-[var(--surface-2)] transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                pathname === item.href
                  ? 'text-[var(--primary)] bg-[var(--surface-2)]'
                  : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/ask"
            className="block w-full px-3 py-3 text-sm font-semibold text-[#17231C] bg-[var(--accent)] hover:bg-[var(--accent-light)] rounded-lg transition-colors text-center"
          >
            Ask a question
          </Link>
          {session ? (
            <>
              {isStaff && (
                <Link
                  href="/admin/dashboard"
                  className="block px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link href="/notifications" className="block px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                Notifications
              </Link>
              <Link href="/drafts" className="block px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                Drafts
              </Link>
              <Link href="/bookmarks" className="block px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                Saved
              </Link>
              <Link
                href="/me"
                className="block px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              >
                Profile
              </Link>
              <Link href="/settings" className="block px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                Settings
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full text-left px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block px-3 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block px-3 py-3 text-sm font-semibold text-white bg-[var(--primary)] rounded-lg transition-colors text-center"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
