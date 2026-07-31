import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReviewsService } from '../../services/reviews.service';
import { Review } from '../../models/review.model';
import { ReportReason } from '../../enums/testimonial.enum';

export interface ReportDialogData { review: Review; }

@Component({
  selector: 'app-report-review-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatProgressSpinnerModule,
  ],
  templateUrl: './report-review-dialog.component.html',
  styleUrl:    './report-review-dialog.component.scss',
})
export class ReportReviewDialogComponent {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(ReviewsService);
  protected readonly data  = inject<ReportDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ReportReviewDialogComponent>);

  protected submitting = signal(false);
  protected success    = signal(false);

  protected readonly reasons: { value: ReportReason; label: string }[] = [
    { value: ReportReason.SPAM,               label: 'Spam or advertising' },
    { value: ReportReason.FAKE_REVIEW,        label: 'Fake or misleading review' },
    { value: ReportReason.ABUSE,              label: 'Harassment or abuse' },
    { value: ReportReason.OFFENSIVE_LANGUAGE, label: 'Offensive language' },
    { value: ReportReason.OTHER,              label: 'Other' },
  ];

  protected form = this.fb.group({
    reason:   ['' as ReportReason, Validators.required],
    comments: ['', [Validators.maxLength(500)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const { reason, comments } = this.form.getRawValue();
    this.svc.report(this.data.review.id, { reason: reason!, comments: comments ?? undefined }).subscribe({
      next: () => { this.success.set(true); this.submitting.set(false); setTimeout(() => this.dialogRef.close(true), 1400); },
      error: () => this.submitting.set(false),
    });
  }

  get charCount(): number { return this.form.get('comments')?.value?.length ?? 0; }
}
