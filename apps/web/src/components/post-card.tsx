import Link from 'next/link';
import { LanguageBadge } from './language-badge';
import { MessageCircle, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { timeAgo } from '@/lib/time-ago';

interface PostCardProps {
  id: string;
  title: string;
  seoSlug: string;
  body?: string;
  voteScore: number;
  answerCount: number;
  commentCount?: number;
  viewCount?: number;
  language: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
  community?: {
    id: string;
    slug: string;
    name: string;
  };
}

export function PostCard(props: PostCardProps) {
  const initials = props.author.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <article className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--primary)]/30 transition-all group cursor-pointer">
      <div className="flex items-start gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          <button className="w-7 h-7 rounded-lg hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] flex items-center justify-center transition-all">
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{props.voteScore}</span>
          <button className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 flex items-center justify-center transition-all">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <LanguageBadge language={props.language} />
            <span className="text-xs text-[var(--text-muted)]">in</span>
            <Link href={`/c/${props.community?.slug}`} className="text-xs font-medium text-[var(--primary)] hover:underline">
              {props.community?.name || 'General'}
            </Link>
          </div>

          {/* Title */}
          <Link href={`/q/${props.seoSlug}`}>
            <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug mb-2 font-malayalam line-clamp-2">
              {props.title}
            </h3>
          </Link>

          {/* Body preview */}
          {props.body && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
              {props.body.slice(0, 150)}...
            </p>
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{props.author.username}</span>
              <span className="text-[var(--border)]">·</span>
              <span className="text-xs text-[var(--text-muted)]">{timeAgo(props.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {props.answerCount}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {props.viewCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
