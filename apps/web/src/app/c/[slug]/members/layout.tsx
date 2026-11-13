import type { Metadata } from 'next';
import { serverApiFetch } from '@/lib/api';

type Community = { slug: string; name: string };

// The members page is a client component, so its title comes from this server layout.
// Without it every member list inherited the site-wide home title.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const community = await serverApiFetch<Community>(`/api/v1/communities/${slug}`);
    return {
      title: `Members of ${community.name} — askvyo`,
      description: `Members and moderators of the ${community.name} community on askvyo.`,
      alternates: { canonical: `/c/${community.slug}` },
      robots: { index: false, follow: true },
    };
  } catch {
    return { title: 'Community members — askvyo', alternates: { canonical: `/c/${slug}` }, robots: { index: false, follow: true } };
  }
}

export default function CommunityMembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
