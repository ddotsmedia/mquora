import type { MetadataRoute } from 'next';

// PWA manifest: lets people "Add to Home Screen" on Android/iOS and open askvyo like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'askvyo — Malayalam Knowledge Community',
    short_name: 'askvyo',
    description: 'Ask questions and share knowledge in Malayalam, English or Manglish.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F5EE',
    theme_color: '#1F6B45',
    lang: 'ml',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
