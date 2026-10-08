import { Inter, Noto_Sans_Malayalam } from 'next/font/google';

export const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const malayalamFont = Noto_Sans_Malayalam({
  subsets: ['malayalam'],
  weight: ['400', '500', '700'],
  variable: '--font-malayalam',
});
