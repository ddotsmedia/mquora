import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'askvyo community';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const name = params.slug.replace(/-/g, ' ');
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0D1712 0%, #1F6B45 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ color: '#4ADE80', fontSize: 28, fontWeight: 700, marginBottom: 32, letterSpacing: 2 }}>
          askvyo • Malayalam Community
        </div>
        <div style={{ color: '#ffffff', fontSize: 64, fontWeight: 800, textTransform: 'capitalize' }}>
          {name}
        </div>
        <div style={{ color: '#86EFAC', fontSize: 24, marginTop: 24 }}>Join the conversation on askvyo</div>
      </div>
    ),
    { ...size },
  );
}
