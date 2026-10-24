import { siteOrigin } from '@/lib/site';

// llms.txt: a short plain-language map of the site for AI assistants and answer engines.
export function GET() {
  const base = siteOrigin();
  const body = `# askvyo

> askvyo is a Malayalam-first question and answer community for Kerala and Gulf Malayalis. Members ask questions, share knowledge and learn in Malayalam, English or Manglish.

## Main sections
- [Trending and unanswered questions](${base}/discover): latest Malayalam questions and answers
- [Communities](${base}/communities): Kerala, UAE, jobs and careers, health and Ayurveda, money and business, technology, education, food and recipes, travel, Malayalam language
- [Topics](${base}/tags): every topic people ask about, each with its own page under /t/
- [Top contributors](${base}/leaderboard): members ranked by helpful answers

## About the site
- [About](${base}/about)
- [Community guidelines](${base}/guidelines)
- [Terms of use](${base}/terms)
- [Privacy policy](${base}/privacy)

## Sitemap
- [Sitemap](${base}/sitemap.xml)
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
