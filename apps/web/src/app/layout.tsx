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
  title: "askvyo — Malayalam Q&A and Knowledge Community",
  appleWebApp: { capable: true, title: "askvyo", statusBarStyle: "default" },
  description: "Malayalam Q&A for Kerala and Gulf Malayalis. Ask questions, get answers and share knowledge in Malayalam, English or Manglish.",
  keywords: [
    'Malayalam Q&A', 'Malayalam questions', 'Malayalam questions and answers', 'Malayalam Q&A community',
    'Kerala questions', 'UAE Malayalam questions', 'Gulf Malayali Q&A', 'NRI questions Malayalam',
    'askvyo', 'Kerala knowledge community', 'ചോദ്യങ്ങൾ', 'ചോദ്യോത്തരം', 'Malayalam answers', 'Kerala community',
    'ask questions in Malayalam', 'Manglish questions and answers', 'Malayalam knowledge sharing community',
    'Malayalam Q&A for NRIs', 'Kerala community questions', 'Malayalam questions online',
  ],
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
        {/* Privacy-friendly analytics — Umami; no cookies, GDPR-safe */}
        {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_ID && (
          <script
            defer
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_ID}
          />
        )}
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
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Providers>
          <PublicOnly><Navbar /></PublicOnly>
          <GoogleOneTap />
          <main id="main-content">{children}</main>
          <PublicOnly><SiteFooter /></PublicOnly>
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}