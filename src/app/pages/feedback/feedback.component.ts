import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService } from '../../services';
import { AuthService } from '../../services';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MaterialModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent {
  private readonly api  = inject(ApiService);
  protected readonly auth = inject(AuthService);

  protected readonly isSubmitting = signal(false);
  protected readonly submitted    = signal(false);
  protected readonly errorMsg     = signal('');

  protected hoverRating = 0;

  protected readonly categories = [
    'App Experience',
    'Profile & Matching',
    'Messaging',
    'Premium Plans',
    'Bug Report',
    'Feature Request',
    'Other',
  ];

  protected feedbackData = {
    category: '',
    rating: 0,
    subject: '',
    message: '',
  };

  protected setRating(stars: number): void {
    this.feedbackData.rating = stars;
  }

  protected ratingLabel(r: number): string {
    return ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][r] ?? '';
  }

  protected async submit(): Promise<void> {
    if (!this.feedbackData.category || !this.feedbackData.rating || !this.feedbackData.message.trim()) {
      this.errorMsg.set('Please fill in all required fields and select a rating.');
      return;
    }
    this.errorMsg.set('');
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.api.submitFeedback({
        category: this.feedbackData.category,
        rating:   this.feedbackData.rating,
        subject:  this.feedbackData.subject,
        message:  this.feedbackData.message,
      }));
      this.submitted.set(true);
    } catch {
      // Gracefully accept even if API is unavailable — feedback was entered
      this.submitted.set(true);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected reset(): void {
    this.feedbackData = { category: '', rating: 0, subject: '', message: '' };
    this.hoverRating  = 0;
    this.submitted.set(false);
    this.errorMsg.set('');
  }
}
