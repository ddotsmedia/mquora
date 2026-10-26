'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { useSession } from 'next-auth/react';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/ask', label: 'Ask', icon: PlusCircle, accent: true },
  { href: '/notifications', label: 'Alerts', icon: Bell, authOnly: true },
  { href: '/me', label: 'Profile', icon: User, authOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide inside admin
  if (pathname?.startsWith('/admin')) return null;

  const visibleItems = items.filter(i => !i.authOnly || session);

  // When logged out, fill the 2 auth slots with login/register links
  const guestExtra = !session
    ? [
        { href: '/login', label: 'Log in', icon: User, accent: false, authOnly: false },
      ]
    : [];

  const allItems = [...visibleItems, ...guestExtra];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md safe-bottom">
      <ul className="flex items-stretch">
        {allItems.map(({ href, label, icon: Icon, accent }) => {
          const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  accent
                    ? 'text-[var(--accent)]'
                    : active
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon
                  size={accent ? 26 : 22}
                  strokeWidth={active || accent ? 2.2 : 1.6}
                  className={accent ? 'drop-shadow-sm' : ''}
                />
                <span className={`text-[10px] font-medium leading-none ${accent ? 'text-[var(--accent)]' : ''}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
