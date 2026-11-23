import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { SeoService } from '../../core/seo/seo.service';
import { breadcrumbLd, faqLd, serviceLd } from '../../core/seo/structured-data';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { LANDING_CONTENT, LandingPageContent } from './landing-pages.content';

/**
 * Public SEO landing page (/ai-matchmaking, /tamil-matrimony, …). One component renders every page
 * from landing-pages.content.ts; the route passes the slug as `data.landing`.
 * Prerendered at build time, so search engines get the full text in the HTML response.
 */
@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly page: LandingPageContent =
    LANDING_CONTENT[inject(ActivatedRoute).snapshot.data['landing'] as string];

  constructor() {
    const p = this.page;
    const path = `/${p.slug}`;
    const site = this.seo.siteUrl;
    this.seo.apply({
      title: p.title,
      description: p.description,
      path,
      index: true,
      // Social previews use the default 1200×630 JPEG (WebP heroes preview unreliably in WhatsApp etc.).
      jsonLd: [
        breadcrumbLd(site, [{ name: 'Home', path: '/' }, { name: p.crumb, path }]),
        ...(p.service ? [serviceLd(site, { ...p.service, description: p.description, path })] : []),
        faqLd(p.faqs),
      ],
    });
  }

  protected trackCta(location: string): void {
    this.analytics.track('cta_register_click', { cta_location: location, page_path: `/${this.page.slug}` });
  }
}
