import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService } from '../../services';
import { AuthService } from '../../services';
import { firstValueFrom } from 'rxjs';

export enum FeedbackCategory {
  WEBSITE_EXPERIENCE = 'WEBSITE_EXPERIENCE',
  PROFILE_MATCHING = 'PROFILE_MATCHING',
  MESSAGING = 'MESSAGING',
  AI_MATCHMAKING = 'AI_MATCHMAKING',
  PREMIUM_BILLING = 'PREMIUM_BILLING',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  BUG_REPORT = 'BUG_REPORT',
  SUGGESTION = 'SUGGESTION',
  COMPLAINT = 'COMPLAINT',
  MOBILE_EXPERIENCE = 'MOBILE_EXPERIENCE',
  SAFETY_SECURITY = 'SAFETY_SECURITY',
  PRIVACY_ACCOUNT = 'PRIVACY_ACCOUNT',
  SUCCESS_STORY = 'SUCCESS_STORY',

  // Profile-specific feedback
  PROFILE_POSITIVE = 'PROFILE_POSITIVE',
  PROFILE_NEGATIVE = 'PROFILE_NEGATIVE',
  PROFILE_REPORT = 'PROFILE_REPORT',

  OTHER = 'OTHER',
}
export const FeedbackCategoryLabels: Record<FeedbackCategory, string> = {
  [FeedbackCategory.WEBSITE_EXPERIENCE]: 'Website Experience',
  [FeedbackCategory.PROFILE_MATCHING]: 'Profile & Matching',
  [FeedbackCategory.MESSAGING]: 'Messaging & Communication',
  [FeedbackCategory.AI_MATCHMAKING]: 'AI Matchmaking',
  [FeedbackCategory.PREMIUM_BILLING]: 'Premium Plans & Billing',
  [FeedbackCategory.CUSTOMER_SUPPORT]: 'Customer Support',
  [FeedbackCategory.FEATURE_REQUEST]: 'Feature Request',
  [FeedbackCategory.BUG_REPORT]: 'Bug Report',
  [FeedbackCategory.SUGGESTION]: 'Suggestion',
  [FeedbackCategory.COMPLAINT]: 'Complaint',
  [FeedbackCategory.MOBILE_EXPERIENCE]: 'Mobile App Experience',
  [FeedbackCategory.SAFETY_SECURITY]: 'Safety & Security',
  [FeedbackCategory.PRIVACY_ACCOUNT]: 'Privacy & Account',
  [FeedbackCategory.SUCCESS_STORY]: 'Success Story',
  [FeedbackCategory.PROFILE_POSITIVE]: 'Positive Profile Feedback',
  [FeedbackCategory.PROFILE_NEGATIVE]: 'Negative Profile Feedback',
  [FeedbackCategory.PROFILE_REPORT]: 'Report Profile',
  [FeedbackCategory.OTHER]: 'Other',
};
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


  protected readonly categories1 = [
  'Website Experience',
  'Profile & Matching',
  'Messaging & Communication',
  'AI Matchmaking',
  'Premium Plans & Billing',
  'Customer Support',
  'Feature Request',
  'Bug Report',
  'Suggestion',
  'Complaint',
  'Mobile App Experience',
  'Safety & Security',
  'Privacy & Account',
  'Success Story',
  'Other',
];

protected readonly categories = [
  FeedbackCategory.WEBSITE_EXPERIENCE,
  FeedbackCategory.PROFILE_MATCHING,
  FeedbackCategory.MESSAGING,
  FeedbackCategory.AI_MATCHMAKING,
  FeedbackCategory.PREMIUM_BILLING,
  FeedbackCategory.CUSTOMER_SUPPORT,
  FeedbackCategory.FEATURE_REQUEST,
  FeedbackCategory.BUG_REPORT,
  FeedbackCategory.SUGGESTION,
  FeedbackCategory.COMPLAINT,
  FeedbackCategory.MOBILE_EXPERIENCE,
  FeedbackCategory.SAFETY_SECURITY,
  FeedbackCategory.PRIVACY_ACCOUNT,
  FeedbackCategory.SUCCESS_STORY,
  FeedbackCategory.PROFILE_POSITIVE,
  FeedbackCategory.PROFILE_NEGATIVE,
  FeedbackCategory.PROFILE_REPORT,
  FeedbackCategory.OTHER,
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
        isAnonymous: !this.auth.isAuthenticated(),
      }));
      this.submitted.set(true);
    } catch (err: any) {
      console.error('Feedback submission failed:', err);
      this.errorMsg.set('Failed to submit feedback. Please try again later.');
      // Gracefully accept even if API is unavailable — feedback was entered
      //this.submitted.set(true);
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
