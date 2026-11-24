import { Routes } from '@angular/router';

/**
 * Mounted at /discover (authGuard on the parent in app.routes.ts).
 * Member-only and never indexed: no `seo` data, not prerendered (CLAUDE.md §24).
 * Admin screens gate themselves via <app-admin-layout> (no router-level role guard exists).
 *
 * Category pages are generic: `:category` is a segment from CATEGORY_CONFIGS
 * (astrologers, marriage-halls, wedding-planners, matrimonial-consultants,
 * photographers, catering-decoration, wedding-shopping). Static paths are
 * listed first so they win over the parameter.
 */
export const DISCOVER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/discover-home/discover-home.page').then(m => m.DiscoverHomePage),
  },
  {
    path: 'favorites',
    loadComponent: () => import('./pages/discover-favorites/discover-favorites.page').then(m => m.DiscoverFavoritesPage),
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-discover.page').then(m => m.AdminDiscoverPage),
  },
  {
    path: 'admin/providers/new',
    loadComponent: () => import('./admin/admin-provider-editor.page').then(m => m.AdminProviderEditorPage),
  },
  {
    path: 'admin/providers/:id',
    loadComponent: () => import('./admin/admin-provider-editor.page').then(m => m.AdminProviderEditorPage),
  },
  {
    path: ':category',
    loadComponent: () => import('./pages/category-search/category-search.page').then(m => m.CategorySearchPage),
  },
  {
    // :id is a discovery provider id (uuid).
    path: ':category/:id',
    loadComponent: () => import('./pages/provider-detail/provider-detail.page').then(m => m.ProviderDetailPage),
  },
];
