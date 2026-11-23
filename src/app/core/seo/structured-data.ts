import { Crumb, FaqItem, SITE_LOGO, SITE_NAME, SOCIAL_PROFILES } from './seo.model';

/**
 * schema.org JSON-LD builders. Only describe Aurora itself and its public content — never a member.
 * `site` is the public origin without a trailing slash (environment.siteUrl).
 */
export const abs = (site: string, path: string): string =>
  /^https?:\/\//i.test(path) ? path : `${site}${path.startsWith('/') ? '' : '/'}${path}`;

export function organizationLd(site: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    name: SITE_NAME,
    url: `${site}/`,
    logo: abs(site, SITE_LOGO),
    slogan: 'Where Forever Begins',
    description:
      'Aurora Matrimony is an Indian matrimonial platform with AI-assisted partner search, compatibility scoring, ' +
      'horoscope (Kundli) matching and 16-type personality matching for brides, grooms and their families.',
    sameAs: SOCIAL_PROFILES,
  };
}

export function websiteLd(site: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site}/#website`,
    name: SITE_NAME,
    url: `${site}/`,
    inLanguage: 'en',
    publisher: { '@id': `${site}/#organization` },
  };
}

export function breadcrumbLd(site: string, crumbs: Crumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(site, c.path),
    })),
  };
}

/** Only for FAQs that are visible on the same page. */
export function faqLd(faqs: FaqItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function serviceLd(site: string, s: { name: string; description: string; path: string; serviceType: string; areaServed?: string[] }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    serviceType: s.serviceType,
    description: s.description,
    url: abs(site, s.path),
    provider: { '@id': `${site}/#organization` },
    ...(s.areaServed?.length ? { areaServed: s.areaServed } : {}),
  };
}

export function blogPostingLd(site: string, p: {
  headline: string; description: string; path: string; image: string;
  authorName: string; published: string; modified: string; category?: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.headline.slice(0, 110),
    description: p.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(site, p.path) },
    url: abs(site, p.path),
    image: [abs(site, p.image)],
    author: { '@type': 'Person', name: p.authorName },
    publisher: { '@id': `${site}/#organization` },
    datePublished: p.published,
    dateModified: p.modified,
    ...(p.category ? { articleSection: p.category } : {}),
  };
}
