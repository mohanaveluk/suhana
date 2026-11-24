import { Routes } from '@angular/router';
import { VerifyEmailComponent } from './pages/verify/verify-email.component';
import { authGuard } from './guards/auth.guard';
import { PAGE_SEO } from './core/seo/page-seo';
import { LANDING_PAGES } from './features/seo-pages/landing-pages.registry';

/**
 * SEO: routes without `data.seo` are noindex by default (SeoService). Only public marketing and
 * content pages carry SEO data — never profile, search, account or admin routes.
 */

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { seo: PAGE_SEO.home },
  },
  {
    path: 'home-v2',
    loadComponent: () => import('./pages/home-v2/home-v2').then(m => m.HomeV2Component),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot/forgot-password').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
  },
  {
    path: 'profile/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/edit-profile/edit-profile').then(m => m.EditProfileComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent),
  },
  {
    // Public: guests browse a limited view and are nudged to register.
    path: 'search',
    loadComponent: () => import('./pages/search/search').then(m => m.SearchComponent),
  },
  {
    // Detailed profile view for any profile by ID (distinct from the user's own /profile)
    path: 'profile-view/:id',
    data: {
      profileType: 'profile'
    },
    loadComponent: () =>
      import('./pages/profile-view/profile-view.component').then(m => m.ProfileViewComponent),
  },
  {
    // Detailed profile view for any profile by ID (distinct from the user's own /profile)
    path: 'view/:id',
    data: {
      profileType: 'view'
    },
    loadComponent: () =>
      import('./pages/profile-view/profile-view.component').then(m => m.ProfileViewComponent),
  },
  {
    path: 'profile-match/:id',
    loadComponent: () =>
      import('./pages/profile-match/profile-match.component').then(m => m.ProfileMatchComponent),
  },
  {
    path: 'matchmaking',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/matchmaking/matchmaking').then(m => m.MatchmakingComponent),
  },
  {
    path: 'matchmaking/:profileId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/matchmaking/matchmaking').then(m => m.MatchmakingComponent),
  },
  {
    path: 'compare',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/compare/compare').then(m => m.CompareComponent),
  },
  {
    path: 'shortlist',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shortlist/shortlist').then(m => m.ShortlistComponent),
  },
  {
    // Who's interested in me — member-only, never indexed or prerendered.
    path: 'my-interests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-interests/pages/my-interests.page').then(m => m.MyInterestsPage),
  },
  {
    path: 'recently-visited',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/recently-visited/recently-visited.component').then(m => m.RecentlyVisitedComponent),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/chat/chat').then(m => m.ChatComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent),
  },
  {
    path: 'admin/feedback',
    loadComponent: () =>
      import('./admin/feedback/admin-feedback.component').then(m => m.AdminFeedbackComponent),
  },
  {
    path: 'admin/search-analytics',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/admin/ai-search-analytics/admin-ai-search-analytics.component')
        .then(m => m.AdminAiSearchAnalyticsComponent),
  },
  {
    path: 'admin/settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent),
  },
  {
    path: 'admin/edit-profile/:id',
    loadComponent: () =>
      import('./pages/admin-edit-profile/admin-edit-profile').then(m => m.AdminEditProfileComponent),
  },
  {
    path: 'premium',
    data: { seo: PAGE_SEO.membership },
    //canActivate: [authGuard],
    loadComponent: () => import('./pages/premium/premium').then(m => m.PremiumComponent),
  },
  {
    path: 'premium/payment',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/premium-payment/premium-payment').then(m => m.PremiumPaymentComponent),
  },
  {
    path: 'match-tracker',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/match-tracker/match-tracker').then(m => m.MatchTrackerComponent),
  },
  {
    path: 'gallery',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/gallery/gallery-management.component').then(m => m.GalleryManagementComponent),
  },
  {
    path: 'gallery/:profileId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/gallery/gallery-management.component').then(m => m.GalleryManagementComponent),
  },
  {
    path: 'service-unavailable',
    loadComponent: () =>
      import('./pages/service-unavailable/service-unavailable').then(m => m.ServiceUnavailableComponent),
  },
  { path: 'auth/verifyemail/:userGuid/:verificationCode', component: VerifyEmailComponent },
  {
    path: 'horoscope-match/:matchUserId',
    loadComponent: () =>
      import('./pages/horoscope-match/horoscope-match.component').then(
        m => m.HoroscopeMatchComponent
      ),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about-us/about-us.component').then(m => m.AboutUsComponent),
    data: { seo: PAGE_SEO.about },
  },
  {
    path: 'contact',
    data: { seo: PAGE_SEO.contact },
    loadComponent: () =>
      import('./pages/contact/contact.component').then(m => m.ContactComponent),
  },
  {
    path: 'privacy-policy',
    data: { seo: PAGE_SEO.privacy },
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
  },
  { path: 'privacy', redirectTo: 'privacy-policy', pathMatch: 'full' },
  {
    path: 'terms-of-service',
    data: { seo: PAGE_SEO.terms },
    loadComponent: () =>
      import('./pages/terms-of-service/terms-of-service.component').then(m => m.TermsOfServiceComponent),
  },
  { path: 'terms', redirectTo: 'terms-of-service', pathMatch: 'full' },
  { path: 'about-us', redirectTo: 'about', pathMatch: 'full' },
  { path: 'contact-us', redirectTo: 'contact', pathMatch: 'full' },
  { path: 'membership-plans', redirectTo: 'premium', pathMatch: 'full' },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/notifications/notification.component').then(m => m.NotificationComponent),
  },
  {
    path: 'accept/:interestId/:guid',
    loadComponent: () =>
      import('./pages/accept-interest/accept-interest.component').then(m => m.AcceptInterestComponent),
  },
  // Match Fixed
  {
    path: 'match-fixed/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/match-fixed/match-fixed-form/match-fixed-form.component')
        .then(m => m.MatchFixedFormComponent),
  },
  {
    path: 'match-fixed/me',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/match-fixed/my-match-fixed/my-match-fixed.component')
        .then(m => m.MyMatchFixedComponent),
  },
  {
    path: 'match-fixed/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/match-fixed/match-fixed-edit/match-fixed-edit.component')
        .then(m => m.MatchFixedEditComponent),
  },
  {
    path: 'success-stories',
    data: { seo: PAGE_SEO.successStories },
    loadComponent: () =>
      import('./features/match-fixed/success-stories/success-stories.component')
        .then(m => m.SuccessStoriesComponent),
  },
  {
    path: 'match-fixed/admin',
    loadComponent: () =>
      import('./features/match-fixed/match-fixed-admin-dashboard/match-fixed-admin-dashboard.component')
        .then(m => m.MatchFixedAdminDashboardComponent),
  },
  {
    path: 'safety-tips',
    data: { seo: PAGE_SEO.safetyTips },
    loadComponent: () =>
      import('./pages/safety-tips/safety-tips.component').then(m => m.SafetyTipsComponent),
  },
  {
    path: 'registration-success/:paramKey',
    loadComponent: () =>
      import('./pages/registration-success/registration-success.component').then(
        m => m.RegistrationSuccessComponent,
      ),
  },
  {
    path: 'faq',
    data: { seo: PAGE_SEO.faq },
    loadComponent: () =>
      import('./pages/faq/faq.component').then(m => m.FaqComponent),
  },
  {
    path: 'help',
    data: { seo: PAGE_SEO.help },
    loadComponent: () =>
      import('./pages/help-center/help-center.component').then(m => m.HelpCenterComponent),
  },
  {
    path: 'feedback',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/feedback/feedback.component').then(m => m.FeedbackComponent),
  },
  {
    path: 'testimonials',
    loadChildren: () =>
      import('./features/testimonials/testimonials.routes').then(m => m.TESTIMONIALS_ROUTES),
  },
  {
    path: 'personality',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/personality/personality.routes').then(m => m.PERSONALITY_ROUTES),
  },
  // Public SEO landing pages (/ai-matchmaking, /tamil-matrimony, …) — the component sets its own SEO.
  ...LANDING_PAGES.map(p => ({
    path: p.slug,
    data: { landing: p.slug, seoDynamic: true },
    loadComponent: () =>
      import('./features/seo-pages/landing-page.component').then(m => m.LandingPageComponent),
  })),
  // Blog (public). Index/article pages set their own SEO once the content has loaded.
  {
    path: 'matrimony-blog',
    data: { seoDynamic: true },
    loadComponent: () => import('./features/blog/blog-list.page').then(m => m.BlogListPage),
  },
  {
    path: 'matrimony-blog/:id/:slug',
    data: { seoDynamic: true },
    loadComponent: () => import('./features/blog/blog-article.page').then(m => m.BlogArticlePage),
  },
  {
    // Missing slug → the article page redirects to the canonical /:id/:slug URL.
    path: 'matrimony-blog/:id',
    data: { seoDynamic: true },
    loadComponent: () => import('./features/blog/blog-article.page').then(m => m.BlogArticlePage),
  },
  {
    path: '**',
    data: { seo: PAGE_SEO.notFound },
    loadComponent: () =>
      import('./pages/not-found/not-found').then(m => m.NotFoundComponent),
  },
];
