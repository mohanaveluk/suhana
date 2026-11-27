import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Same session check as `authGuard`, but sends signed-out visitors to the
 * provider login (/providers/login) instead of the member login.
 * Listing-level permission is enforced by the API (owner/staff membership).
 */
export const providerAuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.authenticated()) return true;
  return router.createUrlTree(['/providers/login'], { queryParams: { returnUrl: state.url } });
};
