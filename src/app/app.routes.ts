import { Routes } from '@angular/router';
import { VerifyEmailComponent } from './pages/verify/verify-email.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
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
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./pages/edit-profile/edit-profile').then(m => m.EditProfileComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent),
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search').then(m => m.SearchComponent),
  },
  {
    // Detailed profile view for any profile by ID (distinct from the user's own /profile)
    path: 'profile-view/:id',
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
    loadComponent: () => import('./pages/matchmaking/matchmaking').then(m => m.MatchmakingComponent),
  },
  {
    path: 'matchmaking/:profileId',
    loadComponent: () => import('./pages/matchmaking/matchmaking').then(m => m.MatchmakingComponent),
  },
  {
    path: 'compare',
    loadComponent: () => import('./pages/compare/compare').then(m => m.CompareComponent),
  },
  {
    path: 'shortlist',
    loadComponent: () => import('./pages/shortlist/shortlist').then(m => m.ShortlistComponent),
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat').then(m => m.ChatComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent),
  },
  {
    path: 'premium',
    loadComponent: () => import('./pages/premium/premium').then(m => m.PremiumComponent),
  },
  {
    path: 'premium/payment',
    loadComponent: () =>
      import('./pages/premium-payment/premium-payment').then(m => m.PremiumPaymentComponent),
  },
  {
    path: 'match-tracker',
    loadComponent: () => import('./pages/match-tracker/match-tracker').then(m => m.MatchTrackerComponent),
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('./pages/gallery/gallery-management.component').then(m => m.GalleryManagementComponent),
  },
  {
    path: 'gallery/:profileId',
    loadComponent: () =>
      import('./pages/gallery/gallery-management.component').then(m => m.GalleryManagementComponent),
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
  },
  {
    path: '**',
    redirectTo: '',
  },
];
