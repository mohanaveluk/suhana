import { Routes } from '@angular/router';

export const TESTIMONIALS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reviews/reviews.page').then(m => m.ReviewsPage),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./pages/reviews/reviews.page').then(m => m.ReviewsPage),
  },
  {
    path: 'review/:id',
    loadComponent: () =>
      import('./pages/review-detail/review-detail.page').then(m => m.ReviewDetailPage),
  },
  {
    path: 'submit-review',
    loadComponent: () =>
      import('./pages/submit-review/submit-review.page').then(m => m.SubmitReviewPage),
  },
  {
    path: 'my-reviews',
    loadComponent: () =>
      import('./pages/my-reviews/my-reviews.page').then(m => m.MyReviewsPage),
  },
  {
    path: 'success-stories',
    loadComponent: () =>
      import('./pages/success-stories/success-stories.page').then(m => m.SuccessStoriesPage),
  },
  {
    path: 'success-story/:id',
    loadComponent: () =>
      import('./pages/success-story-detail/success-story-detail.page').then(m => m.SuccessStoryDetailPage),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin-review-dashboard/admin-review-dashboard.page')
        .then(m => m.AdminReviewDashboardPage),
  },
  {
    path: 'admin/pending',
    loadComponent: () =>
      import('./pages/admin/pending-reviews/pending-reviews.page').then(m => m.PendingReviewsPage),
  },
  {
    path: 'admin/reported',
    loadComponent: () =>
      import('./pages/admin/reported-reviews/reported-reviews.page').then(m => m.ReportedReviewsPage),
  },
  {
    path: 'admin/approved',
    loadComponent: () =>
      import('./pages/admin/approved-reviews/approved-reviews.page').then(m => m.ApprovedReviewsPage),
  },
  {
    path: 'admin/featured',
    loadComponent: () =>
      import('./pages/admin/featured-reviews/featured-reviews.page').then(m => m.FeaturedReviewsPage),
  },
];
