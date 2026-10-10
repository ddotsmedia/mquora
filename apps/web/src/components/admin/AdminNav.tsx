'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Flag,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Shield,
  Users,
  Building2,
  Layers,
} from 'lucide-react';

const sections = [
  {
    title: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/communities', label: 'Communities', icon: Building2 },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/content', label: 'Content', icon: Newspaper },
      { href: '/admin/moderation', label: 'Moderation', icon: Shield },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
      { href: '/admin/ai', label: 'Queues', icon: Layers },
      { href: '/admin/config', label: 'Feature flags', icon: Flag },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{s.title}</p>
          <div className="space-y-0.5">
            {s.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-[var(--primary)]/20 text-[var(--text)] shadow-[inset_2px_0_0_var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-[var(--accent)]' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

