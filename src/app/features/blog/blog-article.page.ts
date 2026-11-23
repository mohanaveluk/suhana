import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { SeoService } from '../../core/seo/seo.service';
import { DEFAULT_SHARE_IMAGE } from '../../core/seo/seo.model';
import { blogPostingLd, breadcrumbLd } from '../../core/seo/structured-data';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { BlogService } from './blog.service';
import { PublicBlogPost, blogPostPath, blogSlug } from './blog.model';

/** /matrimony-blog/:id/:slug — one published article. */
@Component({
  selector: 'app-blog-article-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MaterialModule],
  templateUrl: './blog-article.page.html',
  styleUrl: './blog.pages.scss',
})
export class BlogArticlePage {
  private readonly blog = inject(BlogService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;

  protected readonly post = signal<PublicBlogPost | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly error = signal(false);

  protected readonly related = [
    { path: '/how-it-works', text: 'How Aurora Matrimony works' },
    { path: '/ai-matchmaking', text: 'Find compatible matches with AI matchmaking' },
    { path: '/horoscope-matching', text: 'Check horoscope compatibility' },
    { path: '/personality-matching', text: 'Discover your personality match' },
  ];

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const id = this.params.get('id') ?? '';
    this.loading.set(true);
    this.error.set(false);
    try {
      const post = await this.blog.get(id);
      if (!post) {
        this.notFound.set(true);
        this.seo.apply({ title: 'Article not found | Aurora Matrimony', description: 'This article is not available.', index: false });
        return;
      }
      // Old or mistyped slug → move to the canonical URL without a history entry.
      if (this.params.get('slug') !== blogSlug(post.title)) {
        void this.router.navigateByUrl(blogPostPath(post), { replaceUrl: true });
      }
      this.post.set(post);
      this.applySeo(post);
    } catch {
      this.error.set(true);
      this.seo.apply({ title: 'Matrimony Blog | Aurora Matrimony', description: 'Matrimony guides and articles.', index: false });
    } finally {
      this.loading.set(false);
    }
  }

  protected trackCta(): void {
    const p = this.post();
    this.analytics.track('cta_register_click', { cta_location: 'blog_article', page_path: p ? blogPostPath(p) : '/matrimony-blog' });
  }

  private applySeo(p: PublicBlogPost): void {
    const path = blogPostPath(p);
    const site = this.seo.siteUrl;
    const description = this.trim(p.excerpt || this.plainText(p.contentHtml), 160);
    const modified = p.updatedAt ?? p.publishedAt;
    this.seo.apply({
      title: `${this.trim(p.title, 60)} | Aurora Matrimony`,
      description,
      path,
      index: true,
      type: 'article',
      publishedTime: p.publishedAt,
      modifiedTime: modified,
      jsonLd: [
        breadcrumbLd(site, [
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/matrimony-blog' },
          { name: this.trim(p.title, 60), path },
        ]),
        blogPostingLd(site, {
          headline: p.title,
          description,
          path,
          image: DEFAULT_SHARE_IMAGE,
          authorName: p.author?.name || 'Aurora Matrimony',
          published: p.publishedAt,
          modified,
          category: p.categoryLabel,
        }),
      ],
    });
  }

  private plainText(html: string): string {
    return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private trim(text: string, max: number): string {
    const t = (text ?? '').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max - 1);
    return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).trimEnd() + '…';
  }
}
