import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ReviewStats } from '../../models/review.model';

interface TrustPoint { icon: string; label: string; value: string; }

@Component({
  selector: 'app-trust-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './trust-center.component.html',
  styleUrl:    './trust-center.component.scss',
})
export class TrustCenterComponent {
  @Input() stats: ReviewStats | null = null;

  get trustPoints(): TrustPoint[] {
    return [
      {
        icon: 'verified_user',
        label: 'Verified Reviews',
        value: this.stats?.totalReviews
          ? `${this.stats.totalReviews.toLocaleString()} reviews`
          : 'All verified',
      },
      {
        icon: 'shield',
        label: 'Moderated Content',
        value: 'Human-reviewed',
      },
      {
        icon: 'people',
        label: 'Real Members',
        value: this.stats?.totalReviews
          ? `${this.stats.totalReviews.toLocaleString()} reviews`
          : 'Growing community',
      },
      {
        icon: 'lock',
        label: 'Privacy Protected',
        value: 'Data encrypted',
      },
    ];
  }
}
