import { Metadata } from 'next';
import { PostCard } from '@/components/post-card';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q || 'Posts';
  return {
    title: `Search: ${query} — mquora`,
  };
}

interface Post {
  id: string;
  seoSlug: string;
  title: string;
  language: string;
  voteScore: number;
  answerCount: number;
  viewCount: number;
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || '';
  const posts: Post[] = [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-b border-border p-6">
        <h1 className="text-3xl font-bold text-foreground">Search Results</h1>
        <p className="text-muted-foreground mt-2">for "{query}"</p>
      </div>

      <div className="divide-y divide-border">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} {...post} />)
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
