import { ReactNode } from "react";
import { Metadata } from "next";
import { sansFont, malayalamFont } from "@/lib/fonts";
import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "mquora - Malayalam Knowledge Community",
  description: "A Malayalam-first knowledge community for learning, sharing, and discovering",
  openGraph: {
    title: "mquora",
    description: "A Malayalam-first knowledge community",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${sansFont.variable} ${malayalamFont.variable} font-sans bg-[var(--bg)] text-[var(--text)] min-h-screen`}>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}