import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { HelpArticle, HelpCategory } from '../../help-center.model';

@Component({
  selector: 'app-popular-articles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, MaterialModule],
  templateUrl: './popular-articles.component.html',
  styleUrl: './popular-articles.component.scss',
})
export class PopularArticlesComponent {
  readonly articles = input.required<HelpArticle[]>();
  readonly categories = input.required<HelpCategory[]>();
  readonly loading = input(false);
  readonly selectedCategoryId = input<string | null>(null);

  readonly clearFilter = output<void>();

  protected readonly filteredArticles = computed(() => {
    const catId = this.selectedCategoryId();
    const all = this.articles();
    return catId ? all.filter(a => a.categoryId === catId) : all;
  });

  protected readonly selectedCategory = computed(() =>
    this.categories().find(c => c.id === this.selectedCategoryId()) ?? null,
  );

  protected categoryOf(article: HelpArticle): HelpCategory | undefined {
    return this.categories().find(c => c.id === article.categoryId);
  }
}
