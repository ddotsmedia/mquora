'use client';

import { useState } from 'react';

// Long answers start collapsed with a "(more)" link, like Quora.
export function ReadMore({ text, limit = 600 }: { text: string; limit?: number }) {
  const [open, setOpen] = useState(false);
  if (text.length <= limit || open) return <p className="whitespace-pre-wrap text-foreground">{text}</p>;
  return (
    <p className="whitespace-pre-wrap text-foreground">
      {text.slice(0, limit).trimEnd()}…{' '}
      <button onClick={() => setOpen(true)} className="font-medium text-[var(--primary)] hover:underline">(more)</button>
    </p>
  );
}
