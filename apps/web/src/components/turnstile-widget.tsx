'use client';

import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  /** Hidden input name that receives the token (default: "cf-turnstile-response") */
  name?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: object) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile widget.
 * Renders as a hidden challenge (Managed mode) and writes the token
 * into a hidden input so server actions / API calls can verify it.
 *
 * Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in the environment.
 * Falls back silently (no widget rendered) when the key is absent.
 */
export function TurnstileWidget({ name = 'cf-turnstile-response' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    const render = () => {
      if (!containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile!.render(containerRef.current, {
        sitekey: siteKey,
        'response-field-name': name,
        theme: 'auto',
        size: 'normal',
        appearance: 'interaction-only', // Only shows UI if challenge needed
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const scriptId = 'cf-turnstile-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = render;
        document.head.appendChild(script);
      } else {
        // Script loading, wait for it
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            render();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, name]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="mt-2" />;
}
