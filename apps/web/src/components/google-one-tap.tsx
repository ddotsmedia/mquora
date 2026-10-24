'use client';

import { useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';

/**
 * Google One Tap sign-in — renders silently when:
 * - User is NOT signed in
 * - Page is NOT an auth page
 * - NEXT_PUBLIC_GOOGLE_CLIENT_ID is set
 *
 * After the user reads a few answers, a soft prompt appears (handled by Google SDK).
 */
export function GoogleOneTap() {
  const { status } = useSession();
  const pathname = usePathname();
  const initialized = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // Only show for unauthenticated users
    if (status !== 'unauthenticated') return;
    if (!clientId) return;

    // Skip auth-related pages
    const skipPaths = ['/login', '/register', '/auth', '/api'];
    if (skipPaths.some((p) => pathname.startsWith(p))) return;

    // Only initialize once per session
    if (initialized.current) return;
    initialized.current = true;

    const initOneTap = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            await signIn('google-one-tap', {
              credential: response.credential,
              redirect: false,
            });
          } catch {
            // Silently fail — One Tap is enhancement only
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        itp_support: true,
      });

      window.google.accounts.id.prompt();
    };

    // Load Google Identity Services script
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initOneTap;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initOneTap();
    }

    return () => {
      // Cancel prompt on unmount
      window.google?.accounts?.id?.cancel?.();
    };
  }, [status, pathname, clientId]);

  // One Tap renders itself — no DOM output needed
  return null;
}

// Augment window type for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: object) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}
