import { OG_SIZE, pngResponse, renderCard, siteDomain } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'askvyo question';

async function getPost(seoSlug: string) {
  const apiBase =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3100';
  try {
    const res = await fetch(`${apiBase}/api/v1/posts/${seoSlug}?view=0`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { seoSlug: string } }) {
  const post = await getPost(params.seoSlug);
  const title = post?.title || decodeURIComponent(params.seoSlug.replace(/-/g, ' '));
  const answerCount: number = post?.answerCount ?? 0;
  const community: string = post?.community?.name || '';

  const buf = await renderCard({
    kicker: community || 'Malayalam Q&A',
    title,
    meta: `${answerCount} ${answerCount === 1 ? 'answer' : 'answers'} · ${siteDomain()}`,
    domain: siteDomain(),
  });
  return pngResponse(buf);
}
