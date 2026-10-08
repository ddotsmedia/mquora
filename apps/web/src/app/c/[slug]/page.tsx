import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { PostCard } from '@/components/post-card';

interface Community {
  id: string;
  slug: string;
  name: string;
  description?: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
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
  community: {
    id: string;
    slug: string;
    name: string;
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const community = await serverApiFetch<Community>(`/api/v1/communities/${slug}`);
    return {
      title: `${community.name} — mquora`,
      description: community.description || `Join the ${community.name} community on mquora`,
      openGraph: {
        title: community.name,
        description: community.description,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Community not found' };
  }
}

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let community: Community | null = null;
  let posts: Post[] = [];

  try {
    community = await serverApiFetch<Community>(`/api/v1/communities/${slug}`);
    const response = await serverApiFetch<{ data: Post[]; nextCursor: string | null }>(
      `/api/v1/posts?communityId=${community.id}&limit=20`,
    );
    posts = response.data;
  } catch (error) {
    console.error('Failed to fetch community:', error);
    notFound();
  }

  if (!community) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-b border-border p-6 bg-card">
        <h1 className="text-3xl font-bold text-foreground">{community.name}</h1>
        <p className="text-muted-foreground mt-2">{community.description || 'No description'}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <span className="text-muted-foreground">{community.memberCount} members</span>
          <span className="text-muted-foreground">{community.postCount} posts</span>
        </div>
        <button className="mt-4 px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90">
          Join
        </button>
      </div>

      <div className="divide-y divide-border">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} {...post} />)
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No posts yet in this community.</p>
          </div>
        )}
      </div>
    </div>
  );
}
