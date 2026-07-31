import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReviewsService } from '../../services/reviews.service';
import { Review } from '../../models/review.model';
import { ReviewCardComponent } from '../review-card/review-card.component';
import { LoadingSkeletonComponent } from '../loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

type ViewMode = 'amazon' | 'list' | 'grid';

@Component({
  selector: 'app-featured-testimonials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatTooltipModule,
    ReviewCardComponent, LoadingSkeletonComponent, EmptyStateComponent,
  ],
  templateUrl: './featured-testimonials.component.html',
  styleUrl:    './featured-testimonials.component.scss',
})
export class FeaturedTestimonialsComponent implements OnInit {
  private readonly svc = inject(ReviewsService);

  protected reviews = signal<Review[]>([]);
  protected loading = signal(true);

  // Amazon-style is default on desktop; card grid on mobile
  protected viewMode = signal<ViewMode>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'amazon'
  );

  ngOnInit(): void {
    this.svc.getFeatured().subscribe({
      next: list => { this.reviews.set(list); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }
}
