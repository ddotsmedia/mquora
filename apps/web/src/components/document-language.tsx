'use client';

import { useEffect } from 'react';

// The root layout sets <html lang="en">, so pages set their own language after hydration.
// Restores "en" on unmount so the value does not leak to other pages.
export function DocumentLanguage({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    return () => { root.lang = 'en'; };
  }, [lang]);
  return null;
}
