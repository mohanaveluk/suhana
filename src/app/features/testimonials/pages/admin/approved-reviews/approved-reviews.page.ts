import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminReviewsService } from '../../../services/admin-reviews.service';
import { Review } from '../../../models/review.model';
import { ReviewStatus, ReviewType } from '../../../enums/testimonial.enum';
import { RatingStarsComponent } from '../../../components/rating-stars/rating-stars.component';

@Component({
  selector: 'app-approved-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe, TitleCasePipe, FormsModule,
    MatButtonModule, MatIconModule, MatTableModule, MatPaginatorModule,
    MatSelectModule, MatFormFieldModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatChipsModule, MatTooltipModule,
    RatingStarsComponent,
  ],
  templateUrl: './approved-reviews.page.html',
  styleUrl:    './approved-reviews.page.scss',
})
export class ApprovedReviewsPage implements OnInit {
  private readonly svc   = inject(AdminReviewsService);
  private readonly snack = inject(MatSnackBar);

  protected reviews    = signal<Review[]>([]);
  protected loading    = signal(true);
  protected total      = signal(0);
  protected processing = signal<string | null>(null);

  // Filters — plain properties for [(ngModel)]
  protected statusFilter: ReviewStatus | ''  = ReviewStatus.APPROVED;
  protected featuredFilter: boolean | ''     = '';
  protected typeFilter: ReviewType | ''      = '';
  protected pageIndex = 0;
  protected pageSize  = 20;

  protected readonly ReviewStatus = ReviewStatus;

  protected readonly statusOptions = [
    { value: '' as const,           label: 'All Statuses' },
    { value: ReviewStatus.PENDING,  label: 'Pending' },
    { value: ReviewStatus.APPROVED, label: 'Approved' },
    { value: ReviewStatus.REJECTED, label: 'Rejected' },
  ];

  protected readonly typeOptions = [
    { value: '' as const,                 label: 'All Types' },
    { value: ReviewType.GENERAL,          label: 'General' },
    { value: ReviewType.MATCHMAKING,      label: 'Matchmaking' },
    { value: ReviewType.MEMBERSHIP,       label: 'Membership' },
    { value: ReviewType.CUSTOMER_SUPPORT, label: 'Customer Support' },
    { value: ReviewType.SUCCESS_STORY,    label: 'Success Story' },
  ];

  protected readonly displayedColumns = ['author', 'rating', 'preview', 'type', 'date', 'featured', 'actions'];

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.svc.listAll({
      status:     this.statusFilter   || undefined,
      featured:   this.featuredFilter === '' ? undefined : this.featuredFilter,
      reviewType: this.typeFilter     || undefined,
      page:       this.pageIndex + 1,
      limit:      this.pageSize,
    }).subscribe({
      next: result => {
        this.reviews.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  protected onPageChange(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize  = e.pageSize;
    this.load();
  }

  protected approve(review: Review): void {
    this.processing.set(review.id);
    this.svc.approve(review.id).subscribe({
      next: updated => {
        this.reviews.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.processing.set(null);
        this.snack.open('Review approved.', 'OK', { duration: 2500 });
      },
      error: () => { this.processing.set(null); this.snack.open('Error approving.', 'OK', { duration: 3000 }); },
    });
  }

  protected reject(review: Review): void {
    this.processing.set(review.id);
    this.svc.reject(review.id, { adminNotes: 'Does not meet community guidelines.' }).subscribe({
      next: updated => {
        this.reviews.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.processing.set(null);
        this.snack.open('Review rejected.', 'OK', { duration: 2500 });
      },
      error: () => { this.processing.set(null); this.snack.open('Error rejecting.', 'OK', { duration: 3000 }); },
    });
  }

  protected toggleFeatured(review: Review): void {
    this.processing.set(review.id);
    this.svc.feature(review.id, { featured: !review.isFeatured }).subscribe({
      next: updated => {
        this.reviews.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.processing.set(null);
        this.snack.open(
          updated.isFeatured ? 'Marked as featured.' : 'Feature removed.',
          'OK', { duration: 2500 }
        );
      },
      error: () => { this.processing.set(null); this.snack.open('Error updating featured.', 'OK', { duration: 3000 }); },
    });
  }
}
