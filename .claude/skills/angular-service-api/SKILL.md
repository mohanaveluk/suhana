---
name: angular-service-api
description: Use when adding or changing an API call, a signal-backed data service, or a wire model (DTO interface) in this repo — extending ApiService, creating a providedIn:'root' service, optimistic updates with rollback, or reconciling a *.model.ts with the backend contract.
---

# API calls, services and models — Aurora Matrimony

Backend is a separate NestJS repo (`suhana-api`). Never guess the contract: open the controller/DTO, or ask. Existing front-end models are often more optimistic than the API.

## 1. Layering
```
component  →  feature/global service (signals, state, error handling)  →  ApiService (thin HTTP wrapper)  →  HttpClient
```
- **Components never inject `HttpClient`.**
- **Never create a per-feature API class.** All HTTP lives in the one flat `src/app/services/api.service.ts`.

## 2. Adding an `ApiService` method
1. Find the matching `// Section` comment header (Auth, Profiles, Matches, Chat, Premium, Admin, AI Search, Profile Visits, …). Add under it; create a new header only for a genuinely new area.
2. Thin wrapper only — no state, no mapping, no error handling:
```ts
getRecentProfileVisits(page = 1, limit = 20): Observable<PaginatedProfileVisits> {
  const params = new HttpParams().set('page', page).set('limit', limit);
  return this.http.get<PaginatedProfileVisits>(`${this.baseUrl}/v1/profile-visits/recent`, { params });
}
```
3. All URLs are `${this.baseUrl}/v1/...` (baseUrl = `environment.apiUrl`).
4. Don't attach auth headers yourself — the functional `authInterceptor` in `src/app/interceptors/` does it, and skips public auth/health/refresh routes.
5. Put request/response types in a model file and import by **direct path**.

## 3. Writing a service
- `@Injectable({ providedIn: 'root' })`, `inject(ApiService)`.
- Private writable signals, public `asReadonly()`; typical set: `profiles`, `loading`, `error`, `total`.
- Convert with `firstValueFrom(...)` and expose `async` methods; keep RxJS only for streams (WebSocket, router events, typeahead).
- Always `try/catch/finally`: set `loading` in/out, store a user-readable `error` message (`err?.error?.message ?? 'Could not …'`), and return a safe empty value rather than throwing, unless the caller must distinguish failure (then rethrow).
- Optimistic updates: snapshot → apply → call → rollback on failure (see `ProfileVisitService.deleteProfile`).
- Auth: document whether the endpoint requires a token. Callers must check `AuthService.authenticated()` before calling authenticated endpoints; services don't gate themselves.
- Reset cached per-user state when the user changes/logs out (see the `effect` in `ProfileService`).
- Co-locate a single-feature service next to its feature; global ones go in `src/app/services/`.

## 4. Barrel files
- `services/index.ts` exports only 13 of 21 services. Import others by relative path; optionally add to the barrel, but never assume it's complete.
- `models/index.ts` is incomplete (`user.model.ts` is an empty re-export). Import models by direct path.

## 5. Wire models
- Header comment: "Mirrors `suhana-api/.../<file>.dto.ts`" (convention in `ai-search.model.ts`, `profile-visit.model.ts`).
- Mark a field optional (`?`) or `| null` if the backend can omit it. When a runtime crash reveals a mismatch, fix the model and add a line to CLAUDE.md §19.
- `UserProfile.userId` is the **profile id**; `UserProfile.id` is never sent. Don't "fix" the naming.
- Dates arrive as ISO strings even if typed `Date` — convert at the edge if you format them.
- Responses are inconsistently wrapped (`res.data ?? res`, `res.profiles ?? res`). Normalise inside the service once, like `MatchFixedService` does, so components get one shape.

## 6. Errors and UX
- Network-down/503/504 → `httpErrorInterceptor` redirects to `/service-unavailable`; 401 → refresh flow in `authInterceptor`. Don't duplicate either.
- Surface other errors via the service `error` signal and/or `CommonService`'s error-to-snackbar helper (`MatSnackBar`, not SweetAlert).
- Never log or display tokens, `cryptoSecret`, or full user objects.

## 7. Verify
1. `npx tsc --noEmit -p tsconfig.app.json`, then `npx ng build --configuration production`.
2. Exercise success, empty, error (offline/401) paths in the browser; check Network tab for the exact URL/params.
3. If you changed a shared service (`ApiService`, `AuthService`, `ChatbotService`, auth chain) add a **Risks / Migration notes** section.
4. Propose a Jasmine spec using `HttpTestingController` (few specs exist today).
