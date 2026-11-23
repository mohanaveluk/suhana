import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { SeoService } from '../../core/seo/seo.service';
import { PAGE_SEO } from '../../core/seo/page-seo';
import { breadcrumbLd } from '../../core/seo/structured-data';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { BlogService } from './blog.service';
import { PublicBlogPost, blogPostPath } from './blog.model';

/** /matrimony-blog — published guides and articles. Indexable only once it has articles. */
@Component({
  selector: 'app-blog-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MaterialModule],
  templateUrl: './blog-list.page.html',
  styleUrl: './blog.pages.scss',
})
export class BlogListPage {
  private readonly blog = inject(BlogService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly posts = signal<PublicBlogPost[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly pathOf = blogPostPath;

  protected readonly guides = [
    { path: '/how-it-works', text: 'How Aurora Matrimony works' },
    { path: '/horoscope-matching', text: 'Horoscope matching for marriage' },
    { path: '/personality-matching', text: '16 personality type matching' },
    { path: '/ai-matchmaking', text: 'AI matchmaking explained' },
    { path: '/safety-tips', text: 'Online matrimony safety tips' },
  ];

  constructor() {
    this.applySeo(false);
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.posts.set(await this.blog.list(1, 24));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
      this.applySeo(this.posts().length > 0);
    }
  }

  protected trackCta(): void {
    this.analytics.track('cta_register_click', { cta_location: 'blog_index', page_path: '/matrimony-blog' });
  }

  /** An empty blog is a thin page — keep it out of the index until there are articles. */
  private applySeo(hasPosts: boolean): void {
    this.seo.apply({
      ...PAGE_SEO.blog,
      index: hasPosts,
      jsonLd: [breadcrumbLd(this.seo.siteUrl, [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/matrimony-blog' }])],
    });
  }
}
