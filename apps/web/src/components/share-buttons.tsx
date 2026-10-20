'use client';

import { useState } from 'react';
import { toast } from 'sonner';

// Share a question: WhatsApp first (most used by the community), then Telegram, Facebook, X, copy link / native share.
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window === 'undefined' ? path : `${window.location.origin}${path}`);
  const enc = encodeURIComponent;
  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  const native = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: url() }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url());
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={`${btn} !border-[#25D366]/40 !text-[#128C4B] hover:!bg-[#25D366]/10`} onClick={() => open(`https://wa.me/?text=${enc(`${title}\n${url()}`)}`)}>
        WhatsApp
      </button>
      <button className={btn} onClick={() => open(`https://t.me/share/url?url=${enc(url())}&text=${enc(title)}`)}>Telegram</button>
      <button className={btn} onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`)}>Facebook</button>
      <button className={btn} onClick={() => open(`https://twitter.com/intent/tweet?url=${enc(url())}&text=${enc(title)}`)}>X</button>
      <button className={btn} onClick={native}>{copied ? 'Copied ✓' : 'Copy link'}</button>
    </div>
  );
}
