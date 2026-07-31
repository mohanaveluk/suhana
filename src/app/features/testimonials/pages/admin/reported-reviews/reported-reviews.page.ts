import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AdminReviewsService } from '../../../services/admin-reviews.service';
import { ReviewReport } from '../../../models/review.model';
import { ReportStatus } from '../../../enums/testimonial.enum';

@Component({
  selector: 'app-reported-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe,
    MatButtonModule, MatIconModule, MatTableModule,
    MatProgressSpinnerModule, MatTooltipModule, MatChipsModule,
  ],
  templateUrl: './reported-reviews.page.html',
  styleUrl:    './reported-reviews.page.scss',
})
export class ReportedReviewsPage implements OnInit {
  private readonly svc   = inject(AdminReviewsService);
  private readonly snack = inject(MatSnackBar);

  protected reports    = signal<ReviewReport[]>([]);
  protected loading    = signal(true);
  protected processing = signal<string | null>(null);

  protected readonly displayedColumns = ['reporter', 'reason', 'review', 'date', 'status', 'actions'];

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.listReports({ page: 1, limit: 50 }).subscribe({
      next: result => { this.reports.set(result.items); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  protected dismiss(report: ReviewReport): void {
    this.resolve(report, ReportStatus.DISMISSED);
  }

  protected removeReview(report: ReviewReport): void {
    this.resolve(report, ReportStatus.RESOLVED);
  }

  private resolve(report: ReviewReport, status: ReportStatus): void {
    this.processing.set(report.id);
    this.svc.resolveReport(report.id, { status }).subscribe({
      next: () => {
        this.reports.update(list => list.filter(r => r.id !== report.id));
        this.processing.set(null);
        this.snack.open(
          status === ReportStatus.DISMISSED ? 'Report dismissed.' : 'Review removed.',
          'OK', { duration: 2500 }
        );
      },
      error: () => { this.processing.set(null); this.snack.open('Error resolving report.', 'OK', { duration: 3000 }); },
    });
  }
}
