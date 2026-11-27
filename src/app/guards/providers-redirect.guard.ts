import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn } from '@angular/router';
import { environment } from '../../environments/environment';

/**
 * /providers/** → the separate Aurora for Providers web app, same sub-path
 * (/providers/claim/abc → {providersUrl}/claim/abc). Query strings are kept.
 * Always cancels the in-app navigation; does nothing while prerendering.
 */
export const providersRedirectGuard: CanActivateFn = (_route, state) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    const rest = state.url.replace(/^\/providers/, '') || '/';
    window.location.assign(`${environment.providersUrl}${rest.startsWith('/') ? rest : '/' + rest}`);
  }
  return false;
};
