import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { DiscoverReview } from '../../models/discover.model';
import { DiscoverService } from '../../services/discover.service';
import { apiErrorMessage } from '../../utils/discover.utils';

export interface ReviewDialogData {
  providerId: string;
  providerName: string;
}

@Component({
  selector: 'app-discover-review-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Review {{ data.providerName }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <fieldset class="rd__stars">
          <legend>Your rating</legend>
          @for (n of [1, 2, 3, 4, 5]; track n) {
            <button type="button" mat-icon-button class="rd__star"
                    [attr.aria-label]="n + ' star' + (n > 1 ? 's' : '')"
                    [attr.aria-pressed]="form.value.rating === n"
                    (click)="form.controls.rating.setValue(n); form.controls.rating.markAsTouched()">
              <mat-icon>{{ (form.value.rating ?? 0) >= n ? 'star' : 'star_border' }}</mat-icon>
            </button>
          }
          @if (form.controls.rating.touched && form.controls.rating.invalid) {
            <mat-error>Choose a rating.</mat-error>
          }
        </fieldset>

        <mat-form-field appearance="outline" class="rd__full">
          <mat-label>Title (optional)</mat-label>
          <input matInput formControlName="title" maxlength="150" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="rd__full">
          <mat-label>Your experience</mat-label>
          <textarea matInput formControlName="comment" rows="5" maxlength="2000"></textarea>
          <mat-hint align="end">{{ form.value.comment?.length ?? 0 }} / 2000</mat-hint>
          @if (form.controls.comment.hasError('minlength') || form.controls.comment.hasError('required')) {
            <mat-error>Please write at least 20 characters.</mat-error>
          }
        </mat-form-field>

        <p class="rd__note">Reviews are published after a quick check by our team. Please describe your own experience only.</p>
        @if (error()) { <p class="rd__error" role="alert">{{ error() }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button class="suhana-btn-primary" type="submit" (click)="form.markAllAsTouched()">
          {{ saving() ? 'Submitting…' : 'Submit review' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .rd__stars { border: 0; padding: 0; margin: 0 0 12px; legend { font-weight: 600; margin-bottom: 4px; } }
    .rd__star mat-icon { color: var(--suhana-gold); }
    .rd__full { width: 100%; }
    .rd__note { font-size: 13px; color: var(--suhana-text-secondary); margin: 0; }
    .rd__error { color: #b3261e; margin: 8px 0 0; }
  `],
})
export class ReviewDialogComponent {
  protected readonly data = inject<ReviewDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ReviewDialogComponent, DiscoverReview | undefined>);
  private readonly discover = inject(DiscoverService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    rating: this.fb.control<number | null>(null, Validators.required),
    title: this.fb.control(''),
    comment: this.fb.control('', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      const review = await this.discover.createReview(this.data.providerId, {
        rating: v.rating!,
        title: v.title?.trim() || undefined,
        comment: v.comment!.trim(),
      });
      this.ref.close(review);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not submit your review. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }
}
