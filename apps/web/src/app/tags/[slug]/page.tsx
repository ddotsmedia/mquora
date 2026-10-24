import { permanentRedirect } from 'next/navigation';

// Topic pages live at /t/[slug]. This older path is kept as a permanent redirect so search engines
// consolidate on one URL instead of indexing two copies of every topic.
export default async function TagRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/t/${encodeURIComponent(slug)}`);
}
