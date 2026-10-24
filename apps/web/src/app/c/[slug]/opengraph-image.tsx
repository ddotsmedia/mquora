import { OG_SIZE, pngResponse, renderCard, siteDomain } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'askvyo community';

async function getCommunity(slug: string) {
  const apiBase =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3100';
  try {
    const res = await fetch(`${apiBase}/api/v1/communities/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const community = await getCommunity(params.slug);
  const name = community?.name || params.slug.replace(/-/g, ' ');
  const memberCount: number = community?.memberCount ?? 0;

  const buf = await renderCard({
    kicker: 'askvyo Community',
    title: name,
    meta: memberCount > 0 ? `${memberCount} members · ${siteDomain()}` : siteDomain(),
    domain: siteDomain(),
  });
  return pngResponse(buf);
}
