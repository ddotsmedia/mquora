'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { apiFetch } from '@/lib/api';

// Unread badge; polls every 60s while the tab is visible.
export function NotificationBell() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      apiFetch<{ count: number }>('/api/v1/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => setCount(r.count))
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [token]);

  if (!token) return null;
  return (
    <Link href="/notifications" aria-label={`Notifications${count ? `, ${count} unread` : ''}`} className="relative rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[var(--accent)] px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
