import { serverApiFetch } from '@/lib/api';
import { OG_SIZE, pngResponse, renderCard, siteDomain } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Question on mquora';

interface PostSummary {
  title: string;
  answerCount: number;
  viewCount: number;
  community: { name: string } | null;
}

export default async function Image({ params }: { params: Promise<{ seoSlug: string }> }) {
  const { seoSlug } = await params;
  const post = await serverApiFetch<PostSummary>(`/api/v1/posts/${seoSlug}?view=0`).catch(() => null);
  const answers = post?.answerCount ?? 0;
  const buf = await renderCard({
    kicker: post?.community?.name ?? 'ചോദ്യം · Question',
    title: post?.title ?? 'അറിവ് പങ്കുവെക്കൂ',
    meta: post ? `${answers} ${answers === 1 ? 'answer' : 'answers'}` : undefined,
    domain: siteDomain(),
  });
  return pngResponse(buf);
}
