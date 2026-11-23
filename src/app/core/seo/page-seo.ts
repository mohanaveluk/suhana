import { SeoData } from './seo.model';

/**
 * SEO for the existing public pages, referenced from app.routes.ts as `data: { seo: PAGE_SEO.x }`.
 * Landing pages carry their own SEO in features/seo-pages/landing-pages.data.ts.
 *
 * Rules: one search intent per page, titles ≤ ~60 characters, descriptions ~150 characters,
 * no keyword lists, and only claims the product actually supports.
 */
export const PAGE_SEO = {
  home: {
    title: 'Indian Matrimony & AI Matchmaking | Aurora Matrimony',
    description:
      'Meet Indian brides and grooms on Aurora Matrimony. AI-assisted partner search, Kundli horoscope matching and personality compatibility. Register free.',
    path: '/',
    index: true,
  },
  about: {
    title: 'About Aurora Matrimony — Where Forever Begins',
    description:
      'Learn how Aurora Matrimony helps Indian families and individuals find a compatible life partner with thoughtful technology, privacy controls and trust.',
    path: '/about',
    index: true,
  },
  contact: {
    title: 'Contact Aurora Matrimony | Help with Your Partner Search',
    description:
      'Questions about your matrimonial profile, membership or matches? Contact the Aurora Matrimony team — we are happy to help you and your family.',
    path: '/contact',
    index: true,
  },
  faq: {
    title: 'Matrimony FAQs — Registration, Matching & Privacy | Aurora',
    description:
      'Answers to common questions about registering on Aurora Matrimony, how matching works, horoscope and personality compatibility, privacy and membership.',
    path: '/faq',
    index: true,
  },
  help: {
    title: 'Help Center | Aurora Matrimony',
    description:
      'Step-by-step help for your Aurora Matrimony account: creating your profile, searching for matches, messaging, membership and staying safe.',
    path: '/help',
    index: true,
  },
  safetyTips: {
    title: 'Online Matrimony Safety Tips | Aurora Matrimony',
    description:
      'Practical safety tips for meeting a potential life partner online — protecting personal details, verifying profiles and meeting safely with family.',
    path: '/safety-tips',
    index: true,
  },
  successStories: {
    title: 'Matrimony Success Stories — Couples Who Met on Aurora',
    description:
      'Real couples who found their life partner on Aurora Matrimony share their journeys, shared with their permission. Begin your own story today.',
    path: '/success-stories',
    index: true,
  },
  reviews: {
    title: 'Member Reviews of Aurora Matrimony',
    description:
      'Read what members say about their experience on Aurora Matrimony — the partner search, matching features and support, in their own words.',
    path: '/testimonials/reviews',
    index: true,
  },
  membership: {
    title: 'Matrimony Membership Plans — Free, Silver, Gold & Platinum | Aurora',
    description:
      'Compare Aurora Matrimony plans. Start free, then upgrade for more daily matches, advanced filters, chat, horoscope matching and profile visibility boosts.',
    path: '/premium',
    index: true,
  },
  privacy: {
    title: 'Privacy Policy | Aurora Matrimony',
    description:
      'How Aurora Matrimony collects, uses and protects your personal and matrimonial profile information, and the privacy choices available to you.',
    path: '/privacy-policy',
    index: true,
  },
  terms: {
    title: 'Terms of Service | Aurora Matrimony',
    description:
      'The terms that apply when you register and use Aurora Matrimony, including member responsibilities, memberships and acceptable use.',
    path: '/terms-of-service',
    index: true,
  },
  blog: {
    title: 'Matrimony Blog — Marriage, Compatibility & Partner Search Guides',
    description:
      'Guides for finding the right life partner: horoscope and personality compatibility, writing a matrimonial profile, NRI matrimony and family decisions.',
    path: '/matrimony-blog',
    index: true,
  },
  notFound: {
    title: 'Page Not Found | Aurora Matrimony',
    description: 'The page you are looking for could not be found.',
    index: false,
  },
} satisfies Record<string, SeoData>;
