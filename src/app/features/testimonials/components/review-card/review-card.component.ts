import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { LikeButtonComponent } from '../like-button/like-button.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';
import { SentimentIconPipe, SentimentColorPipe } from '../../pipes/sentiment-icon.pipe';
import { Review } from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';

const MAX_PREVIEW = 280;

@Component({
  selector: 'app-review-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe, TitleCasePipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatMenuModule, MatTooltipModule,
    RatingStarsComponent, LikeButtonComponent,
    VerifiedBadgeComponent, SentimentIconPipe, SentimentColorPipe,
  ],
  templateUrl: './review-card.component.html',
  styleUrl:    './review-card.component.scss',
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;
  @Input() layout: 'card' | 'row' | 'amazon' = 'card';
  @Input() showActions = true;
  @Input() isAuthenticated = false;
  @Output() replyClick  = new EventEmitter<Review>();
  @Output() reportClick = new EventEmitter<Review>();
  @Output() editClick   = new EventEmitter<Review>();
  @Output() deleteClick = new EventEmitter<Review>();

  private readonly reviewsService  = inject(ReviewsService);
  protected readonly router        = inject(Router);
  protected expanded = signal(false);

  get previewText(): string {
    return this.review.reviewText.length > MAX_PREVIEW && !this.expanded()
      ? this.review.reviewText.slice(0, MAX_PREVIEW) + '…'
      : this.review.reviewText;
  }

  get shouldTruncate(): boolean {
    return this.review.reviewText.length > MAX_PREVIEW;
  }

  get authorInitials(): string {
    return (this.review.author?.name ?? 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  protected onLikeToggle(liked: boolean): void {
    if (!this.isAuthenticated) { this.router.navigate(['/login']); return; }
    (liked ? this.reviewsService.like(this.review.id) : this.reviewsService.unlike(this.review.id))
      .subscribe();
  }
}
