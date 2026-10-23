import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'askvyo question';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { seoSlug: string } }) {
  const title = decodeURIComponent(params.seoSlug.replace(/-/g, ' '));
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0D1712 0%, #1F6B45 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ color: '#4ADE80', fontSize: 28, fontWeight: 700, marginBottom: 24, letterSpacing: 2 }}>
          askvyo • Malayalam Q&A
        </div>
        <div style={{ color: '#ffffff', fontSize: 52, fontWeight: 800, lineHeight: 1.3, maxWidth: 1000 }}>
          {title.length > 120 ? title.slice(0, 120) + '…' : title}
        </div>
        <div style={{ color: '#86EFAC', fontSize: 24, marginTop: 40 }}>
          Ask. Answer. Learn. In Malayalam.
        </div>
      </div>
    ),
    { ...size },
  );
}
