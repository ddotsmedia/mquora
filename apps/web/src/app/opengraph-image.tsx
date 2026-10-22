import { OG_SIZE, pngResponse, renderCard, siteDomain } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'mquora — Malayalam knowledge community';

export default async function Image() {
  const buf = await renderCard({
    kicker: 'Malayalam-first community',
    title: 'അറിവ് പങ്കുവെക്കൂ — ചോദിക്കൂ, ഉത്തരം നൽകൂ',
    meta: 'Malayalam · English · Manglish',
    domain: siteDomain(),
  });
  return pngResponse(buf);
}
