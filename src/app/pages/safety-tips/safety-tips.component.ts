import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { SafetyTipsService } from './safety-tips.service';
import { SafetyCategory, CATEGORY_META } from './safety-tips.model';

@Component({
  selector: 'app-safety-tips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MaterialModule],
  templateUrl: './safety-tips.component.html',
  styleUrl:    './safety-tips.component.scss',
})
export class SafetyTipsComponent implements OnInit {
  private readonly svc = inject(SafetyTipsService);

  protected readonly isLoading      = this.svc.isLoading;
  protected readonly categoryMeta   = CATEGORY_META;
  protected readonly allCategories  = Object.values(SafetyCategory);
  protected readonly searchQuery    = signal('');
  protected readonly activeCategory = signal<SafetyCategory | null>(null);

  protected readonly featuredTips = computed(() =>
    this.svc.tips().filter(t => t.isFeatured)
  );

  protected readonly filteredGroups = computed(() => {
    const q   = this.searchQuery().toLowerCase().trim();
    const cat = this.activeCategory();

    const filtered = this.svc.tips().filter(t => {
      const matchesCat = !cat || t.category === cat;
      const matchesQ   = !q
        || t.title.toLowerCase().includes(q)
        || t.content.toLowerCase().includes(q)
        || CATEGORY_META[t.category].label.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });

    const map = new Map<SafetyCategory, typeof filtered>();
    for (const tip of filtered) {
      const arr = map.get(tip.category) ?? [];
      arr.push(tip);
      map.set(tip.category, arr);
    }
    return [...map.entries()].map(([category, tips]) => ({
      category,
      meta: CATEGORY_META[category],
      tips: [...tips].sort((a, b) => a.displayOrder - b.displayOrder),
    }));
  });

  protected readonly resultCount = computed(() =>
    this.filteredGroups().reduce((sum, g) => sum + g.tips.length, 0)
  );

  protected readonly hasActiveFilter = computed(() =>
    !!this.searchQuery().trim() || !!this.activeCategory()
  );

  async ngOnInit(): Promise<void> {
    await this.svc.loadTips();
  }

  setCategory(cat: SafetyCategory | null): void {
    this.activeCategory.set(cat);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.activeCategory.set(null);
  }
}
