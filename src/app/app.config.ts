import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions } from '@angular/material/tooltip';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

/**
 * Material's tooltip sets inline `touch-action: none` on every element that has matTooltip (its default
 * touchGestures: 'auto'), which stops a swipe that starts on that element from scrolling the page — e.g.
 * the profile photo on a search card. 'off' keeps scrolling native; hover/focus tooltips are unaffected.
 */
const tooltipDefaults: MatTooltipDefaultOptions = { showDelay: 0, hideDelay: 0, touchendHideDelay: 1500, touchGestures: 'off' };

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideAnimationsAsync(),
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: tooltipDefaults },
    // httpErrorInterceptor must be outermost so authInterceptor (inner) handles 401 refresh first
    provideHttpClient(withInterceptors([httpErrorInterceptor, authInterceptor])),
  ]
};
