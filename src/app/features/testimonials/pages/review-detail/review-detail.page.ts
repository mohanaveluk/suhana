import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../services/auth.service';
import { ReviewsService } from '../../services/reviews.service';
import { Review } from '../../models/review.model';
import { RatingStarsComponent } from '../../components/rating-stars/rating-stars.component';
import { VerifiedBadgeComponent } from '../../components/verified-badge/verified-badge.component';
import { LikeButtonComponent } from '../../components/like-button/like-button.component';
import { ReviewRepliesComponent } from '../../components/review-replies/review-replies.component';
import { SentimentIconPipe, SentimentColorPipe } from '../../pipes/sentiment-icon.pipe';
import { ReportReviewDialogComponent } from '../../dialogs/report-review-dialog/report-review-dialog.component';

@Component({
  selector: 'app-review-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe, TitleCasePipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    RatingStarsComponent, VerifiedBadgeComponent, LikeButtonComponent,
    ReviewRepliesComponent, SentimentIconPipe, SentimentColorPipe,
  ],
  templateUrl: './review-detail.page.html',
  styleUrl:    './review-detail.page.scss',
})
export class ReviewDetailPage implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly svc    = inject(ReviewsService);
  private readonly dialog = inject(MatDialog);

  protected readonly isAuthenticated = inject(AuthService).authenticated;

  protected review    = signal<Review | null>(null);
  protected loading   = signal(true);
  protected showReply = signal(false);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.params['id'];
    try {
      const r = await firstValueFrom(this.svc.getPublicDetail(id));
      this.review.set(r);
    } finally {
      this.loading.set(false);
    }
  }

  protected onLikeToggle(liked: boolean): void {
    const r = this.review();
    if (!r) return;
    (liked ? this.svc.like(r.id) : this.svc.unlike(r.id)).subscribe({
      next: () => this.review.update(old =>
        old ? { ...old, likeCount: liked ? old.likeCount + 1 : old.likeCount - 1 } : old
      ),
    });
  }

  protected openReport(): void {
    const r = this.review();
    if (!r) return;
    this.dialog.open(ReportReviewDialogComponent, {
      data: { review: r }, width: '440px', maxWidth: '96vw', panelClass: 'suhana-dialog',
    });
  }
}
