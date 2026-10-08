import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  reputationScore: number;
  createdAt: string;
  posts: Array<{
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
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  try {
    const user = await serverApiFetch<UserProfile>(`/api/v1/users/${username}`);
    return {
      title: `${user.displayName} — mquora`,
      description: user.bio || `Profile of ${user.displayName} on mquora`,
    };
  } catch {
    return { title: 'User not found' };
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let user: UserProfile | null = null;

  try {
    user = await serverApiFetch<UserProfile>(`/api/v1/users/${username}`);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    notFound();
  }

  if (!user) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-b border-border p-6 bg-card">
        <h1 className="text-3xl font-bold text-foreground">{user.displayName}</h1>
        <p className="text-muted-foreground mt-1">@{user.username}</p>
        {user.bio && <p className="text-foreground mt-2">{user.bio}</p>}

        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <p className="text-muted-foreground">Reputation</p>
            <p className="text-lg font-semibold text-foreground">{user.reputationScore}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Member since</p>
            <p className="text-lg font-semibold text-foreground">
              {formatDistanceToNow(new Date(user.createdAt), {addSuffix: true})}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Posts</p>
            <p className="text-lg font-semibold text-foreground">{user.posts.length}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="border-b border-border p-6 bg-card">
          <h2 className="text-xl font-semibold text-foreground">Recent Posts</h2>
        </div>

        <div className="divide-y divide-border">
          {user.posts.length > 0 ? (
            user.posts.map((post) => <PostCard key={post.id} {...post} />)
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No posts yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
