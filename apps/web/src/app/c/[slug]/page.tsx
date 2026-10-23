import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiFetch } from '@/lib/api';
import { PostCard } from '@/components/post-card';
import { JoinButton } from '@/components/join-button';
import { siteOrigin } from '@/lib/site';

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
      title: `${community.name} — askvyo`,
      description: community.description || `Join the ${community.name} community on askvyo`,
      alternates: { canonical: `/c/${community.slug}` },
      openGraph: {
        title: community.name,
        description: community.description || `Join the ${community.name} community on askvyo`,
        type: 'website',
        url: `/c/${community.slug}`,
        siteName: 'askvyo',
      },
      twitter: { card: 'summary', title: community.name, description: community.description || `Join ${community.name} on askvyo` },
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

  const origin = siteOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: community.name,
    url: `${origin}/c/${community.slug}`,
    description: community.description || `${community.name} community on askvyo`,
    memberOf: { '@type': 'WebSite', name: 'askvyo', url: origin },
  };

  return (
    <div className="max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b border-[var(--border)] p-6 bg-[var(--surface)]">
        <h1 className="text-3xl font-bold text-[var(--text)]">{community.name}</h1>
        <p className="text-[var(--text-secondary)] mt-2">{community.description || 'No description'}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <span className="text-[var(--text-muted)]">{community.memberCount} members</span>
          <span className="text-[var(--text-muted)]">{community.postCount} posts</span>
        </div>
        <JoinButton communityId={community.id} className="mt-4" />
      </div>

      <div className="divide-y divide-[var(--border)]">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} {...post} />)
        ) : (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <p>No posts yet in this community.</p>
          </div>
        )}
      </div>
    </div>
  );
}
