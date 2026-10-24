import { cn } from '@/lib/utils';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export function getRepTier(score: number): BadgeTier | null {
  if (score >= 10000) return 'diamond';
  if (score >= 2500) return 'platinum';
  if (score >= 500) return 'gold';
  if (score >= 100) return 'silver';
  if (score >= 10) return 'bronze';
  return null;
}

const TIER_CONFIG: Record<BadgeTier, { label: string; emoji: string; color: string; desc: string }> = {
  bronze:   { label: 'Bronze',   emoji: '🥉', color: 'text-amber-700 dark:text-amber-500',  desc: '10+ reputation' },
  silver:   { label: 'Silver',   emoji: '🥈', color: 'text-slate-400 dark:text-slate-300',  desc: '100+ reputation' },
  gold:     { label: 'Gold',     emoji: '🥇', color: 'text-yellow-500 dark:text-yellow-400', desc: '500+ reputation' },
  platinum: { label: 'Platinum', emoji: '💎', color: 'text-cyan-500 dark:text-cyan-400',    desc: '2500+ reputation' },
  diamond:  { label: 'Diamond',  emoji: '✨', color: 'text-violet-500 dark:text-violet-400', desc: '10000+ reputation' },
};

interface ReputationBadgeProps {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function ReputationBadge({ score, size = 'md', showLabel = false, className }: ReputationBadgeProps) {
  const tier = getRepTier(score);
  if (!tier) return null;

  const cfg = TIER_CONFIG[tier];

  return (
    <span
      title={`${cfg.label} member · ${cfg.desc}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        cfg.color,
        'bg-current/10',
        className,
      )}
    >
      <span>{cfg.emoji}</span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}
