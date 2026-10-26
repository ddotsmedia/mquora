'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  Bell,
  Flag,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Shield,
  Users,
  Building2,
  Layers,
  Tags,
  TrendingUp,
  GitMerge,
  Megaphone,
  Activity,
  Clock,
} from 'lucide-react';

export const sections = [
  {
    title: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/insights', label: 'Insights', icon: TrendingUp },
    ],
  },
  {
    title: 'Approvals',
    items: [
      { href: '/admin/pending', label: 'Waiting', icon: Clock, badge: true },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell, badge: true },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/communities', label: 'Communities', icon: Building2 },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/content', label: 'Content', icon: Newspaper },
      { href: '/admin/moderation', label: 'Moderation', icon: Shield },
      { href: '/admin/tags', label: 'Tags', icon: Tags },
      { href: '/admin/duplicates', label: 'Duplicates', icon: GitMerge },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/system', label: 'System health', icon: Activity },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
      { href: '/admin/ai', label: 'Queues', icon: Layers },
      { href: '/admin/config', label: 'Feature flags', icon: Flag },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    const load = () => {
      apiFetch<{ unreadCount: number }>('/api/v1/admin/notifications?unreadOnly=true', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => setUnreadCount(r.unreadCount ?? 0))
        .catch(() => undefined);
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [session?.user?.accessToken]);

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{s.title}</p>
          <div className="space-y-0.5">
            {s.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const count = (item as { badge?: boolean }).badge ? unreadCount : 0;
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
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

