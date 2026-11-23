import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DEFAULT_SHARE_IMAGE, DEFAULT_SHARE_IMAGE_ALT, NOINDEX_DEFAULT, SITE_NAME, SeoData,
} from './seo.model';
import { abs, organizationLd, websiteLd } from './structured-data';

/**
 * Owns everything SEO-related in <head>: title, description, robots, canonical, Open Graph,
 * Twitter card and JSON-LD. Works the same in the browser and during prerendering (only uses
 * DOCUMENT / Title / Meta — no window access).
 *
 * Every navigation replaces the previous page's tags (no stale or duplicate tags): meta tags are
 * updated in place, there is at most one canonical link, and page JSON-LD scripts are removed
 * before new ones are added.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);

  readonly siteUrl = environment.siteUrl.replace(/\/+$/, '');
  private started = false;

  /** Call once at app start: applies each route's `data.seo` (or the noindex default) after navigation. */
  init(): void {
    if (this.started) return;
    this.started = true;
    this.setSiteJsonLd();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const { seo, dynamic } = this.routeSeo(this.router.routerState.snapshot.root);
      if (dynamic) return; // the page calls apply() itself once it knows its content
      this.apply(seo ?? NOINDEX_DEFAULT);
    });
  }

  apply(seo: SeoData): void {
    const indexable = !!seo.index;
    const canonical = indexable && seo.path ? this.url(seo.path) : null;
    const image = abs(this.siteUrl, seo.image || DEFAULT_SHARE_IMAGE);
    const imageAlt = seo.imageAlt || DEFAULT_SHARE_IMAGE_ALT;

    this.title.setTitle(seo.title);
    this.setName('description', seo.description);
    this.setName('robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow');
    this.setCanonical(canonical);

    // Open Graph
    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:locale', 'en_IN');
    this.setProperty('og:type', seo.type ?? 'website');
    this.setProperty('og:title', seo.title);
    this.setProperty('og:description', seo.description);
    this.setProperty('og:url', canonical ?? this.url('/'));
    this.setProperty('og:image', image);
    this.setProperty('og:image:alt', imageAlt);
    this.setProperty('article:published_time', seo.type === 'article' ? seo.publishedTime : undefined);
    this.setProperty('article:modified_time', seo.type === 'article' ? seo.modifiedTime : undefined);

    // Twitter / X
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:site', '@aurora_matrimony');
    this.setName('twitter:title', seo.title);
    this.setName('twitter:description', seo.description);
    this.setName('twitter:image', image);
    this.setName('twitter:image:alt', imageAlt);

    // Structured data only describes pages search engines may index.
    this.setPageJsonLd(indexable ? seo.jsonLd ?? [] : []);
  }

  /** Absolute canonical URL for a site path ('/' → origin + '/'). */
  url(path: string): string {
    const clean = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`;
    return `${this.siteUrl}${clean}`;
  }

  // ── internals ────────────────────────────────────────────────────────────
  /** The deepest route's `data.seo`, and whether that route manages its own SEO (`data.seoDynamic`). */
  private routeSeo(snapshot: ActivatedRouteSnapshot): { seo?: SeoData; dynamic: boolean } {
    let seo: SeoData | undefined;
    let dynamic = false;
    for (let r: ActivatedRouteSnapshot | null = snapshot; r; r = r.firstChild) {
      if (r.data?.['seo']) { seo = r.data['seo'] as SeoData; dynamic = false; }
      if (r.data?.['seoDynamic']) dynamic = true;
    }
    return { seo, dynamic };
  }

  private setName(name: string, content: string | undefined): void {
    if (content) this.meta.updateTag({ name, content }, `name="${name}"`);
    else this.meta.removeTag(`name="${name}"`);
  }

  private setProperty(property: string, content: string | undefined): void {
    if (content) this.meta.updateTag({ property, content }, `property="${property}"`);
    else this.meta.removeTag(`property="${property}"`);
  }

  private setCanonical(href: string | null): void {
    const existing = Array.from(this.doc.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    existing.slice(1).forEach(l => l.remove());
    if (!href) {
      existing[0]?.remove();
      return;
    }
    const link = existing[0] ?? this.doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', href);
    if (!link.parentNode) this.doc.head.appendChild(link);
  }

  private setSiteJsonLd(): void {
    this.doc.head.querySelectorAll('script[data-seo="site"]').forEach(s => s.remove());
    this.doc.head.appendChild(this.jsonLdScript([organizationLd(this.siteUrl), websiteLd(this.siteUrl)], 'site'));
  }

  private setPageJsonLd(items: object[]): void {
    this.doc.head.querySelectorAll('script[data-seo="page"]').forEach(s => s.remove());
    if (items.length) this.doc.head.appendChild(this.jsonLdScript(items, 'page'));
  }

  private jsonLdScript(data: object | object[], kind: 'site' | 'page'): HTMLScriptElement {
    const script = this.doc.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo', kind);
    // Escape '<' so content such as a blog title can never close the <script> element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    return script;
  }
}
