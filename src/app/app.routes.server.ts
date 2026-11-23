import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { LANDING_PAGES } from './features/seo-pages/landing-pages.registry';
import { BlogService } from './features/blog/blog.service';
import { blogSlug } from './features/blog/blog.model';

/**
 * Which pages are rendered to static HTML at build time (outputMode "static", no Node server).
 *
 * Prerender ONLY public marketing/content pages. Everything else — profiles, search, matches,
 * chat, account and admin pages — stays client-rendered (`RenderMode.Client`), so no member data
 * can ever end up in a static HTML file. The build-time HTTP policy
 * (core/interceptors/prerender-http.interceptor.ts) enforces the same rule for API calls.
 */
const STATIC_PUBLIC_PAGES = [
  'about',
  'contact',
  'faq',
  'help',
  'safety-tips',
  'success-stories',
  'privacy-policy',
  'terms-of-service',
  'premium',
  'testimonials/reviews',
  'matrimony-blog',
];

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  ...STATIC_PUBLIC_PAGES.map(path => ({ path, renderMode: RenderMode.Prerender as const })),
  ...LANDING_PAGES.map(p => ({ path: p.slug, renderMode: RenderMode.Prerender as const })),
  {
    // Every published article at build time; newer ones render in the browser until the next build.
    path: 'matrimony-blog/:id/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const posts = await inject(BlogService).listAll();
      return posts.map(p => ({ id: p.id, slug: blogSlug(p.title) }));
    },
  },
  { path: '**', renderMode: RenderMode.Client },
];
