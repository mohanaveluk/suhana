---
name: angular-page-route
description: Use when adding, moving or changing a route or routed page in this repo — editing app.routes.ts, choosing guards (authGuard vs in-component admin check), lazy loading, child routers, id-semantics (/profile-view vs /view), or registering a new admin screen in the admin nav.
---

# Adding or changing a route — Aurora Matrimony

For the component itself, also follow the `angular-component` skill.

## 1. Always start in `src/app/app.routes.ts`
- It is the single source of truth. Read the whole file before editing.
- Everything is lazy via `loadComponent: () => import('./pages/<x>/<x>').then(m => m.<X>Component)`.
- Exactly **one** eager route exists (`auth/verifyemail/...`). Don't add more.
- `loadChildren` is only for features with their own child router (`testimonials`, `personality`). A new feature of that size gets `features/<name>/<name>.routes.ts`.
- The `**` → `NotFoundComponent` wildcard **must stay last**. Insert new routes above it.
- List every place that links to the route (`grep -rn "routerLink\|navigate(" src/app`) before renaming or moving one.

## 2. Pick the access level deliberately
| Kind | What to do |
|---|---|
| Public (marketing/info/login/register) | no guard |
| Public but auth-aware (home, search, profile-view, profile-match) | no guard; the component reduces features for guests |
| Member-only | `canActivate: [authGuard]` (redirects to `/login?returnUrl=<url>`) |
| Admin | `authGuard` **plus** an in-component `AuthService.isAdmin()` check — there is **no** role guard at router level |

Don't assume the router protects an `/admin*` route. Check in `ngOnInit` and redirect/render a denied state.

## 3. Id semantics — a known source of bugs
- `/profile-view/:id` expects the value in `UserProfile.userId` (which is really the **profile id**, `profiles.id`).
- `/view/:id` expects `profileCode`.
- `UserProfile.id` is never sent by the API; the real account id is `UserProfile.user?.id`.
- `/personality/*` `:profileId` params are profile ids — use `profileIdOf()` from `features/personality/utils/personality.utils.ts`.
- Guests must be sent to `/view/<profileCode>`; signed-in members to `/profile-view/<userId>`. If neither is available, send guests to `/login` with `returnUrl`.
- Navigate with `Router.navigate([...])` or `RouterLink`, not `window.location.href` (full reload).

## 4. Admin screens
1. Add the route (`admin/...`) with lazy `loadComponent`.
2. Register it in `src/app/pages/admin/admin-nav.ts` (`ADMIN_MODULES`: `title`, `short`, `description`, `icon`, `route`, `keywords`) regardless of which folder the component lives in — otherwise it won't appear in the hub or sidebar.
3. Gate inside the component with `AuthService.isAdmin()`.
4. Folder: platform-wide admin → `pages/admin/<name>/`; feature-owned admin → that feature's own `admin` sub-tree.

## 5. Route data and params
- Read params with `ActivatedRoute` / `input()` binding (`withComponentInputBinding` only if already enabled in `app.config.ts` — check before relying on it).
- Use `data: { ... }` for variants of one component (as `profile-view` does with `profileType`), and document it next to the route.
- Query-param deep links (e.g. `chat?profileId=`) should be tolerated when missing.

## 6. Don'ts
- Don't modify an existing page's route to preview an alternate; add a sibling route (e.g. `/home-v2`).
- Don't add a guard to `premium` — its `authGuard` is commented out deliberately.
- Don't touch `core/interceptors/auth.interceptor.ts` (dead); the live one is `src/app/interceptors/auth.interceptor.ts`.

## 7. Verify
1. `npx tsc --noEmit -p tsconfig.app.json`
2. `npx ng build --configuration production` — the lazy chunk for the page appears in the output.
3. Open the route as guest and as member; confirm redirects (`returnUrl`), 404 for a bad URL, and that existing routes still load.
4. Report which routes and which `routerLink`s were affected.
