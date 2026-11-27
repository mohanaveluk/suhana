import { Routes } from '@angular/router';
import { providerAuthGuard } from './provider-auth.guard';

/**
 * Mounted at /providers ("For Providers"). The landing, register, login and
 * email-verification pages are public; everything under dashboard/claim needs
 * a session (providerAuthGuard → /providers/login). No SEO data: noindex by
 * default (CLAUDE.md §24).
 *
 * The listing editor is the admin editor component in `mode: 'provider'`
 * (route data) — same form, provider API endpoints, admin-only controls hidden.
 */
export const PROVIDER_PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/providers-landing/providers-landing.page').then(m => m.ProvidersLandingPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/provider-register/provider-register.page').then(m => m.ProviderRegisterPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/provider-login/provider-login.page').then(m => m.ProviderLoginPage),
  },
  {
    // Link in the verification email: {site}/providers/auth/verifyemail/:userGuid/:code
    path: 'auth/verifyemail/:userGuid/:code',
    loadComponent: () => import('./pages/provider-verify/provider-verify.page').then(m => m.ProviderVerifyPage),
  },
  {
    path: 'dashboard',
    canActivate: [providerAuthGuard],
    loadComponent: () => import('./pages/provider-dashboard/provider-dashboard.page').then(m => m.ProviderDashboardPage),
  },
  {
    path: 'dashboard/listings/new',
    canActivate: [providerAuthGuard],
    data: { mode: 'provider' },
    loadComponent: () => import('../discover/admin/admin-provider-editor.page').then(m => m.AdminProviderEditorPage),
  },
  {
    path: 'dashboard/listings/:id',
    canActivate: [providerAuthGuard],
    data: { mode: 'provider' },
    loadComponent: () => import('../discover/admin/admin-provider-editor.page').then(m => m.AdminProviderEditorPage),
  },
  {
    path: 'claim',
    canActivate: [providerAuthGuard],
    loadComponent: () => import('./pages/provider-claim/provider-claim.page').then(m => m.ProviderClaimPage),
  },
  {
    // :providerId is a discovery listing id (from "Claim this business" on a listing page).
    path: 'claim/:providerId',
    canActivate: [providerAuthGuard],
    loadComponent: () => import('./pages/provider-claim/provider-claim.page').then(m => m.ProviderClaimPage),
  },
];
