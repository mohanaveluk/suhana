import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminReviewsService } from '../../../services/admin-reviews.service';
import { Review } from '../../../models/review.model';
import { RatingStarsComponent } from '../../../components/rating-stars/rating-stars.component';

@Component({
  selector: 'app-pending-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe, SlicePipe,
    MatButtonModule, MatIconModule, MatTableModule,
    MatProgressSpinnerModule, MatTooltipModule,
    RatingStarsComponent,
  ],
  templateUrl: './pending-reviews.page.html',
  styleUrl:    './pending-reviews.page.scss',
})
export class PendingReviewsPage implements OnInit {
  private readonly svc   = inject(AdminReviewsService);
  private readonly snack = inject(MatSnackBar);

  protected reviews    = signal<Review[]>([]);
  protected loading    = signal(true);
  protected processing = signal<string | null>(null);

  protected readonly displayedColumns = ['author', 'rating', 'title', 'date', 'actions'];

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.listPending(1, 50).subscribe({
      next: result => { this.reviews.set(result.items); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  protected approve(review: Review): void {
    this.processing.set(review.id);
    this.svc.approve(review.id).subscribe({
      next: () => {
        this.reviews.update(list => list.filter(r => r.id !== review.id));
        this.processing.set(null);
        this.snack.open('Review approved.', 'OK', { duration: 2500 });
      },
      error: () => { this.processing.set(null); this.snack.open('Error approving review.', 'OK', { duration: 3000 }); },
    });
  }

  protected toggleFeatured(review: Review): void {
    this.processing.set(review.id);
    this.svc.feature(review.id, { featured: !review.isFeatured }).subscribe({
      next: updated => {
        this.reviews.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.processing.set(null);
        this.snack.open(updated.isFeatured ? 'Review marked as featured.' : 'Feature removed.', 'OK', { duration: 2500 });
      },
      error: () => { this.processing.set(null); this.snack.open('Error updating featured status.', 'OK', { duration: 3000 }); },
    });
  }

  protected reject(review: Review): void {
    this.processing.set(review.id);
    this.svc.reject(review.id, { adminNotes: 'Does not meet community guidelines.' }).subscribe({
      next: () => {
        this.reviews.update(list => list.filter(r => r.id !== review.id));
        this.processing.set(null);
        this.snack.open('Review rejected.', 'OK', { duration: 2500 });
      },
      error: () => { this.processing.set(null); this.snack.open('Error rejecting review.', 'OK', { duration: 3000 }); },
    });
  }
}
