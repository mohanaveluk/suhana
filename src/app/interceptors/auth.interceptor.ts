import {
  HttpErrorResponse, HttpEvent, HttpHandlerFn,
  HttpInterceptorFn, HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

const TOKEN_KEY = 'suhana_token';
const REFRESH_KEY = 'refresh_token';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

function isPublicRoute(url: string): boolean {
  return (url.includes('/v1/auth/') || url.includes('/v1/token/refresh')) && !url.includes('/v1/auth/update-password-legacy');
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  api: ApiService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(addAuthHeader(req, token))),
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  const storedRefreshToken = localStorage.getItem(REFRESH_KEY);
  if (!storedRefreshToken) {
    isRefreshing = false;
    router.navigate(['/login']);
    return throwError(() => new Error('Session expired. Please log in again.'));
  }

  return api.refreshToken(storedRefreshToken).pipe(
    switchMap(res => {
      isRefreshing = false;
      localStorage.setItem(TOKEN_KEY, res.access_token);
      refreshTokenSubject.next(res.access_token);
      return next(addAuthHeader(req, res.access_token));
    }),
    catchError(err => {
      isRefreshing = false;
      refreshTokenSubject.next(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem('suhana_user');
      router.navigate(['/login']);
      return throwError(() => err);
    }),
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(ApiService);
  const router = inject(Router);

  if (isPublicRoute(req.url)) {
    return next(req);
  }

  const token = localStorage.getItem(TOKEN_KEY);
  return next(addAuthHeader(req, token)).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401(req, next, api, router);
      }
      return throwError(() => error);
    }),
  );
};
