import Link from 'next/link';
import { LanguageBadge } from './language-badge';
import { MessageCircle, Eye, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { timeAgo } from '@/lib/time-ago';
import { BookmarkButton } from './bookmark-button';
import { ReportButton } from './report-button';

interface PostCardProps {
  id: string;
  title: string;
  seoSlug: string;
  body?: string;
  type?: string;
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
    <article className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--primary)]/30 transition-all group">
      {/* Invisible full-card link — sits behind interactive children */}
      <Link href={`/q/${props.seoSlug}`} className="absolute inset-0 rounded-xl" aria-hidden tabIndex={-1} />
      <div className="flex items-start gap-3">
        {/* Vote score column (display only in feed; full voting on the question page) */}
        <div className="relative flex flex-col items-center gap-1 pt-0.5 shrink-0">
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{props.voteScore}</span>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        </div>

        {/* Content */}
        <div className="relative flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <LanguageBadge language={props.language} />
            {props.type === 'ARTICLE' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <FileText className="h-2.5 w-2.5" /> Article
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">in</span>
            <Link href={`/c/${props.community?.slug}`} className="relative z-10 text-xs font-medium text-[var(--primary)] hover:underline">
              {props.community?.name || 'General'}
            </Link>
          </div>

          {/* Title */}
          <Link href={`/q/${props.seoSlug}`} className="relative z-10 block">
            <h3 lang={props.language === 'MALAYALAM' || props.language === 'MIXED' ? 'ml' : undefined} className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug mb-2 font-malayalam line-clamp-2">
              {props.title}
            </h3>
          </Link>

          {/* Body preview */}
          {props.body && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
              {props.body.length > 150 ? props.body.slice(0, 150) + '…' : props.body}
            </p>
          )}

          {/* Bottom row */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex shrink-0 items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="truncate text-xs text-[var(--text-secondary)]">{props.author.username}</span>
              <span className="text-[var(--border)]">·</span>
              <span className="text-xs text-[var(--text-muted)]">{timeAgo(props.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3">
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
              <ReportButton targetId={props.id} targetType="POST" />
              <BookmarkButton postId={props.id} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
