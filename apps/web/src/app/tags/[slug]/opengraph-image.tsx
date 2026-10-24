import { OG_SIZE, pngResponse, renderCard, siteDomain } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'askvyo topic';

async function getTag(slug: string) {
  const apiBase =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3100';
  try {
    const res = await fetch(`${apiBase}/api/v1/tags/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const tag = await getTag(params.slug);
  const name = tag?.name || params.slug.replace(/-/g, ' ');
  const postCount: number = tag?.postCount ?? 0;

  const buf = await renderCard({
    kicker: 'Topic',
    title: name,
    meta: postCount > 0 ? `${postCount} questions · ${siteDomain()}` : siteDomain(),
    domain: siteDomain(),
  });
  return pngResponse(buf);
}
