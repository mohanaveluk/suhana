import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMsg = '';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMsg = `Error: ${error.error.message}`;
      } else if (error.error instanceof Object) {
        errorMsg = error.error.message || error.message || 'An error occurred';
      } else {
        // Server-side error
        errorMsg = `Error Code: ${error.status},  Message: ${error.message}`;
      }
      console.error(errorMsg);
      // Re-throw the error to be caught by the subscription's error block
      return throwError(() => new Error(errorMsg));
    })
  );
};