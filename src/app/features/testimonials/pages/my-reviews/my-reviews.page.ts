import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReviewsService } from '../../services/reviews.service';
import { Review } from '../../models/review.model';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { ReviewStatus } from '../../enums/testimonial.enum';

@Component({
  selector: 'app-my-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
    ReviewCardComponent, EmptyStateComponent, LoadingSkeletonComponent,
  ],
  templateUrl: './my-reviews.page.html',
  styleUrl:    './my-reviews.page.scss',
})
export class MyReviewsPage implements OnInit {
  private readonly svc   = inject(ReviewsService);
  private readonly snack = inject(MatSnackBar);

  protected reviews = signal<Review[]>([]);
  protected loading = signal(true);

  readonly ReviewStatus = ReviewStatus;

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.getMyReviews().subscribe({
      next: result => { this.reviews.set(result.items); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  protected delete(review: Review): void {
    this.reviews.update(list => list.filter(r => r.id !== review.id));
    this.svc.remove(review.id).subscribe({
      error: () => {
        this.reviews.update(list => [...list, review]);
        this.snack.open('Could not delete. Please try again.', 'OK', { duration: 3000 });
      },
    });
    this.snack.open('Review deleted.', 'OK', { duration: 2500 });
  }

  protected statusLabel(status: ReviewStatus): string {
    const map: Record<ReviewStatus, string> = {
      [ReviewStatus.PENDING]:  'Pending Review',
      [ReviewStatus.APPROVED]: 'Published',
      [ReviewStatus.REJECTED]: 'Not Approved',
      [ReviewStatus.HIDDEN]:   'Hidden',
    };
    return map[status] ?? status;
  }
}
