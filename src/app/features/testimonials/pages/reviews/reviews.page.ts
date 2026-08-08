import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '../../services/reviews.service';
import { Review, ReviewStats } from '../../models/review.model';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';
import { OverallRatingComponent } from '../../components/overall-rating/overall-rating.component';
import { TrustCenterComponent } from '../../components/trust-center/trust-center.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ReportReviewDialogComponent } from '../../dialogs/report-review-dialog/report-review-dialog.component';
import { ReviewSort, ReviewType } from '../../enums/testimonial.enum';

@Component({
  selector: 'app-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatPaginatorModule, MatCardModule,
    ReviewCardComponent, OverallRatingComponent, TrustCenterComponent,
    LoadingSkeletonComponent, EmptyStateComponent,
  ],
  templateUrl: './reviews.page.html',
  styleUrl:    './reviews.page.scss',
})
export class ReviewsPage implements OnInit {
  private readonly svc    = inject(ReviewsService);
  private readonly dialog = inject(MatDialog);

  protected reviews    = signal<Review[]>([]);
  protected loading    = signal(true);
  protected total      = signal(0);
  protected stats      = signal<ReviewStats | null>(null);
  protected viewMode   = signal<'list' | 'grid'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list'
  );

  // Plain properties for two-way form binding
  protected pageIndex  = 0;
  protected pageSize   = 10;
  protected sortBy     = ReviewSort.LATEST;
  protected filterType: ReviewType | '' = '';
  protected search     = '';

  protected readonly sortOptions = [
    { value: ReviewSort.LATEST,        label: 'Newest First' },
    { value: ReviewSort.HIGHEST_RATED, label: 'Highest Rated' },
    { value: ReviewSort.MOST_LIKED,    label: 'Most Helpful' },
    { value: ReviewSort.OLDEST,        label: 'Oldest First' },
  ];

  protected readonly typeOptions = [
    { value: '',                          label: 'All Types' },
    { value: ReviewType.GENERAL,          label: 'General' },
    { value: ReviewType.MATCHMAKING,      label: 'Matchmaking' },
    { value: ReviewType.MEMBERSHIP,       label: 'Membership' },
    { value: ReviewType.CUSTOMER_SUPPORT, label: 'Customer Support' },
    { value: ReviewType.SUCCESS_STORY,    label: 'Success Story' },
  ];

  protected isAuthenticated = false;

  ngOnInit(): void {
    this.svc.getStats().subscribe(s => this.stats.set(s));
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.svc.listPublic({
      page:       this.pageIndex + 1,
      limit:      this.pageSize,
      sort:       this.sortBy,
      reviewType: this.filterType || undefined,
      keyword:    this.search || undefined,
    }).subscribe({
      next: result => {
        this.reviews.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onPageChange(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize  = e.pageSize;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  protected clearFilters(): void {
    this.search     = '';
    this.filterType = '';
    this.sortBy     = ReviewSort.LATEST;
    this.applyFilters();
  }

  protected onReport(review: Review): void {
    this.dialog.open(ReportReviewDialogComponent, {
      data: { review },
      width: '440px',
      maxWidth: '96vw',
      panelClass: 'suhana-dialog',
    });
  }
}
