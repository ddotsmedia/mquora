'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsedAnswerProps {
  voteScore: number;
  children: React.ReactNode;
  threshold?: number;
}

/** Auto-collapses answers below a vote-score threshold. */
export function CollapsedAnswer({ voteScore, children, threshold = -3 }: CollapsedAnswerProps) {
  const shouldCollapse = voteScore < threshold;
  const [expanded, setExpanded] = useState(false);

  if (!shouldCollapse || expanded) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        aria-expanded={false}
      >
        <span>
          <span className="text-red-500 font-medium">{voteScore} votes</span>
          {' · '}This answer was downvoted — hidden by default
        </span>
        <span className="flex items-center gap-1 shrink-0 text-[var(--primary)] font-medium">
          Show <ChevronDown className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
