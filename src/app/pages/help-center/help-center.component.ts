import { Component, ChangeDetectionStrategy, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { HelpCenterService } from './help-center.service';
import { HelpArticle, HelpCategory, HelpFaq, HelpSearchHit } from './help-center.model';
import { HelpSearchComponent } from './components/help-search/help-search.component';
import { HelpCategoryGridComponent } from './components/help-category-grid/help-category-grid.component';
import { FeaturedFaqsComponent } from './components/featured-faqs/featured-faqs.component';
import { PopularArticlesComponent } from './components/popular-articles/popular-articles.component';

@Component({
  selector: 'app-help-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MaterialModule,
    HelpSearchComponent, HelpCategoryGridComponent, FeaturedFaqsComponent, PopularArticlesComponent,
  ],
  templateUrl: './help-center.component.html',
  styleUrl: './help-center.component.scss',
})
export class HelpCenterComponent implements OnInit {
  @ViewChild('articlesAnchor') private readonly articlesAnchor?: ElementRef<HTMLElement>;

  private readonly svc = inject(HelpCenterService);
  private readonly router = inject(Router);

  protected readonly categories = signal<HelpCategory[]>([]);
  protected readonly articles = signal<HelpArticle[]>([]);
  protected readonly faqs = signal<HelpFaq[]>([]);

  protected readonly categoriesLoading = signal(true);
  protected readonly articlesLoading = signal(true);
  protected readonly faqsLoading = signal(true);

  protected readonly selectedCategoryId = signal<string | null>(null);

  ngOnInit(): void {
    this.svc.getCategories().subscribe(categories => {
      this.categories.set(categories);
      this.categoriesLoading.set(false);
    });
    this.svc.getPopularArticles().subscribe(articles => {
      this.articles.set(articles);
      this.articlesLoading.set(false);
    });
    this.svc.getFeaturedFaqs().subscribe(faqs => {
      this.faqs.set(faqs);
      this.faqsLoading.set(false);
    });
  }

  protected onCategorySelected(id: string | null): void {
    this.selectedCategoryId.set(id);
    if (id) this.scrollToArticles();
  }

  protected onSearchHit(hit: HelpSearchHit): void {
    if (hit.type === 'category') {
      this.onCategorySelected(hit.id);
      return;
    }
    this.router.navigateByUrl(hit.link);
  }

  private scrollToArticles(): void {
    this.articlesAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
