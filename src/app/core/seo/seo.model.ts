/**
 * SEO metadata for one page. Put it on a route as `data: { seo: … }` (SeoService applies it on
 * navigation), or — for pages whose content decides their SEO (landing pages, blog) — set
 * `data: { seoDynamic: true }` on the route and call SeoService.apply() from the component.
 *
 * Privacy default: a page is NOT indexable unless `index: true` is set explicitly. Member-facing,
 * profile, search and account pages must never set it.
 */
export interface SeoData {
  /** Full <title> text, brand included (e.g. "Horoscope Matching for Marriage | Aurora Matrimony"). */
  title: string;
  /** 120–160 characters, written for the searcher. */
  description: string;
  /** Canonical path, starting with '/', no query string, no trailing slash ('/' for home). */
  path?: string;
  /** true → "index, follow". Omitted/false → "noindex, follow" and no canonical link. */
  index?: boolean;
  /** Share image: absolute URL or site-relative path. Defaults to the brand share image. */
  image?: string;
  imageAlt?: string;
  /** Open Graph type. */
  type?: 'website' | 'article';
  /** Page-level JSON-LD objects (site-wide Organization/WebSite are added automatically). */
  jsonLd?: object[];
  /** Article dates (ISO 8601) for og/article meta. */
  publishedTime?: string;
  modifiedTime?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Crumb {
  name: string;
  path: string;
}

export const SITE_NAME = 'Aurora Matrimony';
export const SITE_TAGLINE = 'Where Forever Begins';
export const DEFAULT_SHARE_IMAGE = '/images/seo/aurora-matrimony-share.jpg';
export const DEFAULT_SHARE_IMAGE_ALT = 'An Indian bride and groom smiling at each other on their wedding day — Aurora Matrimony';
export const SITE_LOGO = '/images/seo/aurora-matrimony-logo.png';

/** Official brand profiles (the same links as the site footer). */
export const SOCIAL_PROFILES = [
  'https://www.facebook.com/aurora.matrimony/',
  'https://www.instagram.com/aurora.matrimony/',
  'https://twitter.com/aurora_matrimony',
  'https://www.youtube.com/@aurora.matrimony',
];

/** Fallback for any route without SEO data: generic and not indexable. */
export const NOINDEX_DEFAULT: SeoData = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: 'Aurora Matrimony — AI-assisted matchmaking, horoscope and personality compatibility for Indian brides and grooms.',
  index: false,
};
