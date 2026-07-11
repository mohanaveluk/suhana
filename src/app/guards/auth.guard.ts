import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that blocks unauthenticated access.
 *
 * Attach to any route whose page/APIs require a logged-in user:
 *   { path: 'search', canActivate: [authGuard], loadComponent: ... }
 *
 * On failure it redirects to /login, preserving the attempted URL as a
 * `returnUrl` query param so the login flow can send the user back.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.authenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
