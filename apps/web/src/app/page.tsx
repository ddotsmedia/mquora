import type { Metadata } from 'next';
import { HomePage } from '@/components/home-page';
import { siteOrigin } from '@/lib/site';

// The homepage is a client component, so its canonical and structured data are set here on the server page.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  const base = siteOrigin();
  // WebSite + Organization markup: lets search engines show a site search box and link the brand name to the site.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'askvyo',
        inLanguage: ['ml', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${base}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'askvyo',
        url: base,
        logo: `${base}/icon.svg`,
        description: 'Malayalam-first question and answer community for Kerala and Gulf Malayalis.',
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <HomePage />
    </>
  );
}
