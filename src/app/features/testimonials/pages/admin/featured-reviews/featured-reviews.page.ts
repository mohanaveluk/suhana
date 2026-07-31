import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AdminReviewsService } from '../../../services/admin-reviews.service';
import { Review } from '../../../models/review.model';
import { ReviewStatus } from '../../../enums/testimonial.enum';
import { RatingStarsComponent } from '../../../components/rating-stars/rating-stars.component';

@Component({
  selector: 'app-featured-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    DragDropModule,
    RatingStarsComponent,
  ],
  templateUrl: './featured-reviews.page.html',
  styleUrl:    './featured-reviews.page.scss',
})
export class FeaturedReviewsPage implements OnInit {
  private readonly svc   = inject(AdminReviewsService);
  private readonly snack = inject(MatSnackBar);

  protected reviews = signal<Review[]>([]);
  protected loading = signal(true);
  protected saving  = signal(false);
  protected isDirty = signal(false);

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.listAll({ featured: true, status: ReviewStatus.APPROVED, limit: 100 }).subscribe({
      next: result => {
        const sorted = [...result.items].sort(
          (a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999)
        );
        this.reviews.set(sorted);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected drop(event: CdkDragDrop<Review[]>): void {
    const list = [...this.reviews()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.reviews.set(list);
    this.isDirty.set(true);
  }

  protected saveOrder(): void {
    this.saving.set(true);
    const items = this.reviews().map((r, i) => ({ reviewId: r.id, featuredOrder: i + 1 }));
    this.svc.reorder(items).subscribe({
      next: () => {
        this.isDirty.set(false);
        this.saving.set(false);
        this.snack.open('Featured order saved.', 'OK', { duration: 2500 });
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('Error saving order.', 'OK', { duration: 3000 });
      },
    });
  }

  protected unfeature(review: Review): void {
    this.svc.feature(review.id, { featured: false }).subscribe({
      next: () => {
        this.reviews.update(list => list.filter(r => r.id !== review.id));
        this.isDirty.set(false);
        this.snack.open('Review removed from featured.', 'OK', { duration: 2500 });
      },
      error: () => this.snack.open('Error removing feature.', 'OK', { duration: 3000 }),
    });
  }
}
