import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { ReviewStats } from '../../models/review.model';

@Component({
  selector: 'app-overall-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [DecimalPipe, MatIconModule, RatingStarsComponent],
  templateUrl: './overall-rating.component.html',
  styleUrl:    './overall-rating.component.scss',
})
export class OverallRatingComponent {
  @Input({ required: true }) stats!: ReviewStats;

  get distributionBars(): { stars: number; count: number; pct: number }[] {
    const total = this.stats.totalReviews || 1;
    const map: Record<number, number> = {
      5: this.stats.fiveStar,
      4: this.stats.fourStar,
      3: this.stats.threeStar,
      2: this.stats.twoStar,
      1: this.stats.oneStar,
    };
    return [5, 4, 3, 2, 1].map(stars => {
      const count = map[stars] ?? 0;
      return { stars, count, pct: Math.round((count / total) * 100) };
    });
  }
}
