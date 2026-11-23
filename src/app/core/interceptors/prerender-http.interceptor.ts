import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { throwError } from 'rxjs';

/** API calls allowed while prerendering: public, non-personal content only. */
const PRERENDER_ALLOWED: RegExp[] = [/\/v1\/public\/blog\//];

/**
 * Build-time privacy guard. While pages are rendered to static HTML (server platform), every API
 * request is refused unless it is explicitly public content — so member profiles, photos or any
 * personal data can never be baked into the prerendered HTML, and builds don't depend on the API
 * being reachable. In the browser this interceptor does nothing.
 *
 * Pages fall back to their loading/empty state in the static HTML and fetch their data normally
 * once the app starts in the browser.
 */
export const prerenderHttpInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) return next(req);
  if (PRERENDER_ALLOWED.some(rx => rx.test(req.url))) return next(req);
  return throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Skipped while prerendering', url: req.url }));
};
