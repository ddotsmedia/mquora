import { ReactNode } from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { sansFont, malayalamFont } from '@/lib/fonts';
import { Navbar } from '@/components/navbar';
import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'mquora — Malayalam Knowledge Community',
  description: 'A Malayalam-first knowledge community for learning, sharing, and discovering',
  openGraph: {
    title: 'mquora',
    description: 'A Malayalam-first knowledge community',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${sansFont.variable} ${malayalamFont.variable} font-sans bg-[var(--bg)] text-[var(--text)] min-h-screen`}>
        <SessionProvider session={session}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            <main>{children}</main>
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
