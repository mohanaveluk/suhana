---
name: angular-component
description: Use when creating or substantially editing an Angular component in this repo (page, shared widget, dialog, feature sub-component). Applies the project's standalone/OnPush/signals conventions, file placement, styling tokens, state handling and accessibility rules, and the verification steps required before calling it done.
---

# Angular component — Aurora Matrimony (codebase name: Suhana)

Follow existing code over this file if they conflict, and flag the drift. Skeletons live in
[templates/](templates/). A good live reference: `src/app/pages/home-v2/components/profile-orbit/`.

## 1. Before writing code
- Grep for an existing component, service or model that already does the job. Reuse; don't duplicate API calls or hardcode data that a service provides.
- Read the host page / sibling components for naming and style.
- If the data shape comes from the backend, confirm optionality against the real DTO. Models in this repo are often more optimistic than the API (CLAUDE.md §19).

## 2. Placement
| Situation | Location |
|---|---|
| Routed page | `src/app/pages/<kebab-name>/<name>.ts` (+ `.html`, `.scss`) |
| Used by exactly one page (dialog, sub-form, widget) | inside that page's folder (`pages/<page>/components/...`) |
| Used by 2+ features | `src/app/shared/components/<name>/` — promote only when a second consumer exists |
| Large self-contained feature | `src/app/features/<feature>/` with own models/services/routes |

File names: `<name>.ts`, `<name>.html`, `<name>.scss` (older code uses `.component.ts`; match the surrounding folder). Selector prefix `app-`.

## 3. Component rules
- **Standalone only**, no NgModules. Material comes from `MaterialModule` (`shared/modules/material.module.ts`); add new Material modules there.
- `changeDetection: ChangeDetectionStrategy.OnPush`.
- `input()` / `output()` / `viewChild()` signal APIs for new code.
- State in `signal()`, derived state in `computed()`. Use `effect()` sparingly; always return cleanup via `onCleanup` for timers/listeners (see profile-orbit's rotation effect). Never call `computed()` over non-signal sources such as `FormGroup.value`; bridge with `toSignal(form.statusChanges)`.
- Control flow: `@if` / `@for` (with `track`) / `@switch`, never `*ngIf` / `*ngFor`.
- `inject()` for DI. Reactive Forms (`FormBuilder`) only.
- API calls go through `ApiService` (flat, sectioned) — never ad hoc `HttpClient` in a component. Use existing services (`ProfileService`, `MatchFixedService`, …); see CLAUDE.md §9 for what the `services/index.ts` barrel does and doesn't export.
- Navigate with `Router`/`RouterLink`, not `window.location`.
- Dumb/presentational components take data via `input()` and emit via `output()`; the host owns loading and navigation.
- Timers/listeners: one timer, cleaned up on destroy; pause when the tab is hidden; respect `prefers-reduced-motion`.
- Don't use `::ng-deep` unless unavoidable; don't edit global `styles.scss` for a single component.

## 4. Template state handling (required)
Every data-driven component must handle, visibly and without errors:
1. **Loading** — shimmer skeleton (pattern: `.rvp-sk*` in recently-visited-profile.scss), `aria-busy`.
2. **Empty** — friendly message and, where sensible, a link to the next action.
3. **Error** — message with a retry action (`role="alert"`).
4. **Partial data** — missing optional fields render nothing, never `undefined`/`null` text. Put defensive reads in typed TS helpers rather than `?.` on non-nullable template types (avoids NG8107 warnings).
5. **Missing/broken images** — fall back to `/avatar-default.svg`; handle `(error)` once.
6. **Guest vs signed-in** — don't call authenticated APIs for guests (`AuthService.authenticated()`).

## 5. Styling
- Tokens: use `--suhana-*` from `:root` in `src/styles.scss` (rose-gold, maroon, gold, ivory, blush, text-primary/secondary, shadow, gradients). For a distinct section theme, define local aliases on `:host` (see `home-v2.scss`).
- No dark mode exists; don't assume dark tokens.
- Buttons: `.suhana-btn-primary` / `.suhana-btn-outline` for standard CTAs (they restate `:disabled` look — copy that if you add an `!important` button class).
- Responsive: layouts must work at ~360px, ~768px, ~1280px; no horizontal page scroll; 16px side gutter on mobile.
- Animate `transform`/`opacity`; wrap motion in `@media (prefers-reduced-motion: reduce)` with a reduced fallback.
- Prefer CSS Grid/Flex and custom properties over JS layout math.

## 6. Accessibility
- Interactive elements are real `<button>`/`<a>`; icon-only buttons have `aria-label`.
- Visible `:focus-visible` styles; keyboard operation for carousels (arrow keys) and dialogs.
- Meaningful `alt`; decorative images `alt=""`; decorative icons `aria-hidden="true"`.
- Don't convey state by color or hover alone; contrast ≥ 4.5:1 for text.
- Carousels: pause on hover/focus, provide a pause control, announce position via `aria-live="polite"`.

## 7. Gotchas to remember (CLAUDE.md §11, §19)
- `AuthService` does **not** use `TokenService`; `core/interceptors/auth.interceptor.ts` is dead. Never edit it.
- `UserProfile.userId` actually holds the **profile id**; `UserProfile.id` is never sent. `/profile-view/:id` takes that value; `/view/:code` takes `profileCode`.
- `models/index.ts` barrel is incomplete — import model files by direct path.
- `[disabled]` on a `formControlName` element, and disabled submit buttons, break touched-gated error messages — keep the button enabled and call `form.markAllAsTouched()` on click.
- `[innerHTML]` strips `style`; `SafeHtml.toString()` is not the markup; `mailto:` is plain text only.
- There is no router-level admin guard — check `AuthService.isAdmin` inside admin components, and register new admin screens in `pages/admin/admin-nav.ts`.
- Existing `home` page must not be modified when building alternates; add new routes to `app.routes.ts` before the `**` wildcard.

## 8. Definition of done
1. `npx tsc --noEmit -p tsconfig.app.json` — clean.
2. `npx ng build --configuration production` — clean, **no new warnings from your files** (template binding errors only show here).
3. If previewable: run it, check console/network, exercise loading/empty/error, resize to mobile, confirm timers stop on destroy.
4. Report: files created/modified, what was verified vs not (don't claim a build/test passed unless it ran), assumptions, and remaining limitations.
5. For shared services (`ApiService`, `AuthService`, `ChatbotService`, auth chain) add a risk note.
6. Propose a Jasmine/Karma outline for new logic; note few specs exist today.

Output format when asked for a patch: Summary → Files Changed → Diff → Rationale → Verify → Risks.
