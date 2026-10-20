'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Hides the public navbar/footer inside the admin console, which has its own layout.
export function PublicOnly({ children }: { children: ReactNode }) {
  const path = usePathname();
  return path?.startsWith('/admin') ? null : <>{children}</>;
}
