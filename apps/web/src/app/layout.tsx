import { ReactNode } from "react";
import { Metadata, Viewport } from "next";
import { sansFont, malayalamFont } from "@/lib/fonts";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { PublicOnly } from "@/components/public-only";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { GoogleOneTap } from "@/components/google-one-tap";
import "./globals.css";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "askvyo - Malayalam Knowledge Community",
  appleWebApp: { capable: true, title: "askvyo", statusBarStyle: "default" },
  description: "A Malayalam-first knowledge community for learning, sharing, and discovering",
  keywords: ['Malayalam Q&A', 'Malayalam questions', 'askvyo', 'Kerala knowledge community', 'ചോദ്യങ്ങൾ', 'Malayalam answers', 'Kerala community'],
  openGraph: {
    title: "askvyo",
    description: "A Malayalam-first knowledge community",
    type: "website",
    siteName: "askvyo",
    locale: "ml_IN",
    alternateLocale: "en_IN",
  },
  twitter: { card: "summary_large_image", site: "@askvyo" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1F6B45" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1712" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "askvyo",
              url: siteOrigin(),
              inLanguage: ["ml", "en"],
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteOrigin()}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className={`${sansFont.variable} ${malayalamFont.variable} font-sans bg-[var(--bg)] text-[var(--text)] min-h-screen`}>
        <Providers>
          <PublicOnly><Navbar /></PublicOnly>
          <GoogleOneTap />
          <main>{children}</main>
          <PublicOnly><SiteFooter /></PublicOnly>
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}