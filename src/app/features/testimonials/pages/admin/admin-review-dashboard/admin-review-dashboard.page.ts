import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminReviewsService } from '../../../services/admin-reviews.service';
import { AdminDashboardMetrics } from '../../../models/review.model';

@Component({
  selector: 'app-admin-review-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DecimalPipe,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
  ],
  templateUrl: './admin-review-dashboard.page.html',
  styleUrl:    './admin-review-dashboard.page.scss',
})
export class AdminReviewDashboardPage implements OnInit {
  private readonly svc = inject(AdminReviewsService);

  protected metrics = signal<AdminDashboardMetrics | null>(null);
  protected loading = signal(true);

  ngOnInit(): void {
    this.svc.dashboard().subscribe({
      next: m  => { this.metrics.set(m); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
