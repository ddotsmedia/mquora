import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { LanguageBadge } from './language-badge';
import { MessageCircle, ThumbsUp } from 'lucide-react';

interface PostCardProps {
  id: string;
  title: string;
  seoSlug: string;
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
  const createdAt = new Date(props.createdAt);

  return (
    <article className="border-b border-border p-4 hover:bg-muted transition-colors">
      <div className="flex gap-4">
        <div className="flex-1">
          <Link href={`/q/${props.seoSlug}`} className="block group">
            <h2 className="text-lg font-semibold text-foreground group-hover:text-accent">
              {props.title}
            </h2>
          </Link>

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{props.author.displayName}</span>
            <span>in</span>
            {props.community && (
              <Link href={`/c/${props.community.slug}`} className="hover:text-accent">
                {props.community.name}
              </Link>
            )}
            <span>•</span>
            <time>{formatDistanceToNow(createdAt, {addSuffix: true})}</time>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <LanguageBadge language={props.language} />
            <span className="text-sm text-muted-foreground">{props.viewCount || 0} views</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <ThumbsUp size={16} />
            <span>{props.voteScore}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle size={16} />
            <span>{props.answerCount}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
