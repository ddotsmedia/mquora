import { Metadata } from 'next';
import { serverApiFetch } from '@/lib/api';
import { PostCard } from '@/components/post-card';

export const metadata: Metadata = {
  title: 'Home — mquora',
  description: 'Explore questions and discussions in the Malayalam knowledge community',
};

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

interface FeedResponse {
  data: Post[];
  nextCursor: string | null;
}

export default async function Home() {
  let posts: Post[] = [];
  let nextCursor: string | null = null;

  try {
    const response = await serverApiFetch<FeedResponse>('/api/v1/posts?limit=20');
    posts = response.data;
    nextCursor = response.nextCursor;
  } catch (error) {
    console.error('Failed to fetch posts:', error);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-b border-border p-6">
        <h1 className="text-3xl font-bold text-foreground">Feed</h1>
        <p className="text-muted-foreground mt-2">Latest questions and discussions</p>
      </div>

      <div className="divide-y divide-border">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} {...post} />)
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No posts yet. Be the first to ask a question!</p>
          </div>
        )}
      </div>

      {nextCursor && (
        <div className="p-4 text-center">
          <button className="px-4 py-2 rounded border border-border hover:bg-muted">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
