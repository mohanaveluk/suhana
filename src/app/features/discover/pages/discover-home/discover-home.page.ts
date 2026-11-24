import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { DiscoverCategory } from '../../models/discover.model';
import { DiscoverService } from '../../services/discover.service';
import { apiErrorMessage } from '../../utils/discover.utils';
import { CategoryConfig, configBySlug } from '../../utils/category-config';

interface Tile {
  category: DiscoverCategory;
  cfg: CategoryConfig | undefined;
  /** Router link when the category is active AND has a page in this build. */
  route: string[] | null;
  image: string | null;
}

@Component({
  selector: 'app-discover-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink],
  templateUrl: './discover-home.page.html',
  styleUrl: './discover-home.page.scss',
})
export class DiscoverHomePage implements OnInit {
  private readonly discover = inject(DiscoverService);

  protected readonly categories = signal<DiscoverCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly tiles = computed<Tile[]>(() =>
    this.categories().map((category) => {
      const cfg = configBySlug(category.slug);
      return {
        category,
        cfg,
        route: category.isActive && cfg ? ['/discover', cfg.segment] : null,
        image: category.imageUrl || cfg?.image || null,
      };
    }));
  protected readonly liveCount = computed(() => this.tiles().filter((t) => t.route).length);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // Always refresh: admins toggle categories live without a deploy.
      this.categories.set(await this.discover.loadCategories(true));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not load Discover categories.'));
    } finally {
      this.loading.set(false);
    }
  }
}
