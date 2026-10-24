import { OG_SIZE, pngResponse, renderCard, siteDomain } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'askvyo profile';

async function getProfile(username: string) {
  const apiBase =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3100';
  try {
    const res = await fetch(`${apiBase}/api/v1/users/profile/${username}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { username: string } }) {
  const profile = await getProfile(params.username);
  const name = profile?.name || `@${params.username}`;
  const credential = profile?.credential || '';
  const answerCount: number = profile?.stats?.answers ?? 0;

  const buf = await renderCard({
    kicker: 'askvyo Profile',
    title: name,
    meta: [
      credential,
      answerCount > 0 ? `${answerCount} answers` : '',
      siteDomain(),
    ].filter(Boolean).join(' · '),
    domain: siteDomain(),
  });
  return pngResponse(buf);
}
