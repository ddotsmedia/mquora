import localFont from 'next/font/local';

export const sansFont = localFont({
  src: [
    {
      path: '../../public/fonts/inter-latin-wght-normal.woff2',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const malayalamFont = localFont({
  src: [
    {
      path: '../../public/fonts/noto-sans-malayalam-malayalam-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/noto-sans-malayalam-malayalam-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/noto-sans-malayalam-malayalam-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-malayalam',
  display: 'swap',
});
