import {
  Component, ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReviewsService } from '../../services/reviews.service';
import { RatingStarsComponent } from '../../components/rating-stars/rating-stars.component';
import { ReviewType } from '../../enums/testimonial.enum';

@Component({
  selector: 'app-submit-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatProgressSpinnerModule, MatStepperModule,
    RatingStarsComponent,
  ],
  templateUrl: './submit-review.page.html',
  styleUrl:    './submit-review.page.scss',
})
export class SubmitReviewPage {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(ReviewsService);
  private readonly router  = inject(Router);
  private readonly snack   = inject(MatSnackBar);

  protected submitting = signal(false);
  protected success    = signal(false);

  protected readonly typeOptions = [
    { value: ReviewType.GENERAL,          label: 'General Experience' },
    { value: ReviewType.MATCHMAKING,      label: 'Matchmaking' },
    { value: ReviewType.MEMBERSHIP,       label: 'Membership' },
    { value: ReviewType.CUSTOMER_SUPPORT, label: 'Customer Support' },
    { value: ReviewType.SUCCESS_STORY,    label: 'Success Story' },
  ];

  protected ratingForm = this.fb.group({
    overallRating:       [0, [Validators.required, Validators.min(1)]],
    easeOfUseRating:     [0],
    matchQualityRating:  [0],
    communicationRating: [0],
    customerSupportRating:[0],
    trustSafetyRating:   [0],
  });

  protected detailForm = this.fb.group({
    title:      ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    reviewText: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(3000)]],
    reviewType: [ReviewType.GENERAL, Validators.required],
    isAnonymous:[false],
    wouldRecommend:[true],
  });

  protected setRating(field: string, value: number): void {
    this.ratingForm.get(field)?.setValue(value);
  }

  protected submit(): void {
    if (this.ratingForm.invalid || this.detailForm.invalid || this.submitting()) return;
    this.submitting.set(true);

    const payload = {
      ...this.ratingForm.getRawValue() as any,
      ...this.detailForm.getRawValue() as any,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.success.set(true);
        this.submitting.set(false);
        this.snack.open('Review submitted! It will appear after moderation.', 'OK', { duration: 5000 });
        setTimeout(() => this.router.navigate(['/testimonials/reviews']), 2000);
      },
      error: () => {
        this.submitting.set(false);
        this.snack.open('Could not submit. Please try again.', 'Retry', { duration: 4000 });
      },
    });
  }

  get overallRating(): number { return this.ratingForm.get('overallRating')?.value ?? 0; }
  get titleLength(): number   { return this.detailForm.get('title')?.value?.length ?? 0; }
  get textLength(): number    { return this.detailForm.get('reviewText')?.value?.length ?? 0; }
}
