/**
 * Slugs of the public SEO landing pages. Kept tiny on purpose: app.routes.ts (eager) and the
 * prerender config import it, while the page text lives in landing-pages.content.ts, which is only
 * loaded with the page itself.
 *
 * `audience` pages target a community or region. Only list audiences Aurora genuinely serves —
 * remove an entry here (and its content block) to unpublish that page everywhere: routes,
 * prerender, sitemap, footer links.
 */
export interface LandingPageEntry {
  slug: string;
  /** Short label for footer / related links. */
  label: string;
  kind: 'feature' | 'audience';
}

export const LANDING_PAGES: readonly LandingPageEntry[] = [
  { slug: 'how-it-works',            label: 'How Aurora Works',          kind: 'feature' },
  { slug: 'ai-matchmaking',          label: 'AI Matchmaking',            kind: 'feature' },
  { slug: 'horoscope-matching',      label: 'Horoscope Matching',        kind: 'feature' },
  { slug: 'personality-matching',    label: '16 Personality Matching',   kind: 'feature' },
  { slug: 'verified-profiles',       label: 'Verified & Safe Profiles',  kind: 'feature' },
  { slug: 'hindu-matrimony',         label: 'Hindu Matrimony',           kind: 'audience' },
  { slug: 'tamil-matrimony',         label: 'Tamil Matrimony',           kind: 'audience' },
  { slug: 'telugu-matrimony',        label: 'Telugu Matrimony',          kind: 'audience' },
  { slug: 'south-indian-matrimony',  label: 'South Indian Matrimony',    kind: 'audience' },
  { slug: 'nri-matrimony',           label: 'NRI Matrimony',             kind: 'audience' },
];
