import fs from 'node:fs';
import path from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
export { siteDomain } from './site';

// Share-card renderer. Uses sharp (libvips + Pango/HarfBuzz) because next/og (satori)
// cannot shape Malayalam: vowel signs and conjuncts render in the wrong order.
export const OG_SIZE = { width: 1200, height: 630 };
const BRAND = '#1F6B45';
const BRAND_DARK = '#123F29';
const ACCENT = '#E0A526';

function fontFile(weight: 'Regular' | 'Bold'): string {
  const name = `NotoSansMalayalam-${weight}.ttf`;
  // Standalone build runs from the repo root; `next dev` runs from apps/web.
  const candidates = [
    path.join(process.cwd(), 'apps/web/assets/fonts', name),
    path.join(process.cwd(), 'assets/fonts', name),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

async function textLayer(markup: string, width: number, weight: 'Regular' | 'Bold', height?: number) {
  return sharp({
    text: {
      text: markup,
      font: 'Noto Sans Malayalam',
      fontfile: fontFile(weight),
      width,
      height,
      rgba: true,
      wrap: 'word',
    },
  })
    .png()
    .toBuffer();
}

export interface CardInput {
  kicker?: string; // small label above the title, e.g. community name
  title: string;
  meta?: string; // e.g. "5 answers · 120 views"
  domain: string;
}

export async function renderCard({ kicker, title, meta, domain }: CardInput): Promise<Buffer> {
  const { width, height } = OG_SIZE;
  const pad = 72;
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND}"/><stop offset="1" stop-color="${BRAND_DARK}"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="${pad}" y="${height - 110}" width="64" height="6" rx="3" fill="${ACCENT}"/>
    </svg>`,
  );

  const layers: OverlayOptions[] = [];
  let y = pad;
  if (kicker) {
    const k = await textLayer(
      `<span foreground="${ACCENT}" font_size="26pt" weight="bold">${esc(clip(kicker, 60))}</span>`,
      width - pad * 2,
      'Bold',
    );
    layers.push({ input: k, left: pad, top: y });
    y += 64;
  }
  // Long titles get a smaller size so they stay within the card.
  const t = clip(title, 160);
  const size = t.length > 110 ? 28 : t.length > 70 ? 32 : t.length > 40 ? 38 : 44;
  const titleImg = await textLayer(
    `<span foreground="#FFFFFF" font_size="${size}pt" weight="bold">${esc(t)}</span>`,
    width - pad * 2,
    'Bold',
    height - y - 150,
  );
  layers.push({ input: titleImg, left: pad, top: y });

  const footer = await textLayer(
    `<span foreground="#FFFFFF" font_size="24pt" weight="bold">${esc(domain)}</span>${
      meta ? `<span foreground="#CFE3D7" font_size="22pt">   ·   ${esc(meta)}</span>` : ''
    }`,
    width - pad * 2,
    'Bold',
  );
  layers.push({ input: footer, left: pad, top: height - 90 });

  return sharp(bg).composite(layers).png().toBuffer();
}

export function pngResponse(buf: Buffer): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
