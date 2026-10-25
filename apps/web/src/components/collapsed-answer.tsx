'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsedAnswerProps {
  voteScore: number;
  /** AI quality score 0-100 from the answer-quality worker; null until scored. */
  qualityScore?: number | null;
  isAccepted?: boolean;
  children: React.ReactNode;
  threshold?: number;
  qualityThreshold?: number;
}

/** Auto-collapses downvoted or low-quality answers. Accepted answers are never hidden. */
export function CollapsedAnswer({ voteScore, qualityScore, isAccepted, children, threshold = -3, qualityThreshold = 20 }: CollapsedAnswerProps) {
  const lowVotes = voteScore < threshold;
  const lowQuality = qualityScore != null && qualityScore < qualityThreshold;
  const shouldCollapse = !isAccepted && (lowVotes || lowQuality);
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
          {lowVotes ? (
            <>
              <span className="text-red-500 font-medium">{voteScore} votes</span>
              {' · '}This answer was downvoted — hidden by default
            </>
          ) : (
            'Low-quality answer — hidden by default'
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-[var(--primary)] font-medium">
          Show <ChevronDown className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
