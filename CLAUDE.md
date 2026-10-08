# CLAUDE.md

This file gives Claude Code the context it needs to work effectively in this repository. It is meant to be read once and trusted as the map of the codebase — but trust is not blind: if something here conflicts with what you actually see in a file, the file wins. Flag the drift instead of silently reconciling it, the same way this doc flags the drift it already found during its own writing (see **Known Gotchas & Inconsistencies**).

---

## 1. Project Overview

**Aurora Matrimony** (product-facing name; the codebase, repo, and most internal identifiers still say **Suhana** — `suhana_token`, `app-suhana`, CSS tokens prefixed `--suhana-*`, etc. The two names refer to the same application; don't "fix" the mismatch, it's just how the rename landed).

**Purpose**: an AI-powered matrimony platform — profile discovery, AI-assisted and traditional search, compatibility scoring, horoscope (Kundli) matching, chat, audio/video calling, and premium membership tiers.

**Target users**: individuals (and their families, per Indian matrimony convention) seeking a life partner, registering as either `bride` or `groom`. A secondary admin/moderator audience manages profiles, reviews, feedback, and match-fixed (arranged-match) outcomes.

**Headline capabilities actually implemented** (verified in code, not aspirational):
- AI-based natural-language search with intent extraction and follow-up chips (`AiSearchService`)
- Traditional filtered search with guest result-capping (`SearchService`)
- Weighted compatibility scoring across education/location/religion/family/career/lifestyle/emotional/horoscope dimensions (`MatchService`, `ProfileMatchComponent`)
- Horoscope/Kundli compatibility reports (Ashtakoota scoring, doshas, planetary positions) (`HoroscopeMatchComponent` + co-located `horoscope-match.service.ts`)
- Chat with WebSocket live updates + polling fallback, attachments, icebreakers (`ChatService`)
- Audio/video calling over a dedicated WebRTC + Socket.IO signaling channel, separate from chat (`CallingService`, `WebRtcService`)
- Mobile number OTP verification, voice introductions, profile photo galleries with cropping
- Trust indicators, profile visit history ("Recently Visited Profiles" — carousel/grid, stats, clear-history)
- Member testimonials/reviews with a full moderation pipeline, and a separate "Match Fixed" (confirmed-match/success-story) tracking feature
- Premium membership tiers (Free/Silver/Gold/Platinum) with a simulated multi-method checkout (no real payment gateway wired up — see §9)
- An admin suite — but scattered across **four independent locations**, not one module (see §7)

---

## 2. Technology Stack

**Frontend** (`package.json`, versions pinned with `^` so treat as "this major/minor or later"):
| Library | Version | Role |
|---|---|---|
| `@angular/core` / `common` / `forms` / `router` / `platform-browser` / `animations` | 21.2.x | Framework — standalone components, signals, new `@if`/`@for` control-flow syntax throughout |
| `@angular/material` / `@angular/cdk` | 21.2.x | Material 3 (M3) theming, all UI components |
| `rxjs` | 7.8 | Used where signals genuinely don't fit (HTTP, WebSocket streams, router events) — not the default state mechanism |
| `typescript` | 5.9.2 | |
| `@auth0/angular-jwt`, `jwt-decode` | — | JWT expiry inspection (used by `TokenService`) |
| `socket.io-client` | 4.8.3 | Powers the **calling** signaling channel only (`CallingService`) — chat/notifications use a *different*, plain-`WebSocket` transport (`WebSocketService`). Two separate real-time stacks, not one. |
| `crypto-js` | 4.2 | AES encrypt/decrypt helpers (`shared/utils/crypto.util.ts`) — used e.g. to obfuscate an email address in a URL param after registration |
| `chart.js` / `ng2-charts` | — | Admin analytics charts (match analytics, AI-search-analytics dashboard) |
| `html2canvas` / `jspdf` | — | Client-generated PDF compatibility reports (`pdf-report.service.ts`) |
| `ngx-image-cropper` | — | Profile photo cropping dialog |
| `sweetalert2` | — | Used specifically for the session-expiry prompt (`TokenExpiryService`) — not the app's general alert mechanism (that's `MatSnackBar`) |

**Backend**: a separate NestJS repo (sibling directory, e.g. `suhana-api/`) exposing a REST API under `{apiUrl}/v1/...` (see §10). This repo only consumes it via `ApiService` — never assume backend internals without actually opening that repo if a task requires it (several past tasks got the API contract wrong by guessing; see §13).

**Testing**: Jasmine/Karma (`ng test`) is configured, but as of this writing very few `*.spec.ts` files exist relative to the number of components/services — don't assume a feature has test coverage just because the tooling supports it.

**Package manager**: npm (`packageManager: "npm@11.4.2"` pinned in `package.json`).

---

## 3. Commands

| Task | Command | Notes |
|---|---|---|
| Start dev server | `npm start` | runs `ng serve` |
| Production build | `npm run build` | plain `ng build` (no `--configuration production` flag by default — add it explicitly if you need the production config: `npx ng build --configuration production`) |
| Production build (explicit) | `npm run build-prod` | `ng build --configuration production` |
| Watch build | `npm run watch` | development config, `--watch` |
| Run unit tests | `ng test` | Jasmine/Karma |
| Type-check only (fast) | `npx tsc --noEmit -p tsconfig.app.json` | catches TS errors without a full Angular/AOT build; **does not** catch template binding errors — follow up with a real build before calling a template-touching change verified |

Always re-check these against the live `package.json` before relying on them — this table has already needed correcting once this session.

---

## 4. Folder Structure — `src/app/`

```
src/app/
├── admin/                  # ONE module lives here: admin/feedback/ (feedback moderation).
│                           #   Everything else admin-related is elsewhere — see §7.
├── core/                   # Cross-cutting infra: token storage, token-expiry prompt,
│   ├── error-handling/     #   global error handler, and interceptors. NOT a dumping ground
│   ├── interceptors/       #   for feature services — contains a DEAD file, see §11.
│   └── services/
├── features/                # Large, self-contained feature modules — own routes/services/
│   ├── calling/              #   models/components, not spread across pages/. The pattern to
│   ├── chatbot/               #   copy for any new, similarly-sized feature (see §7).
│   ├── match-fixed/
│   └── testimonials/          #   (has its own child router — see §5)
├── guards/                  # Route guards. Only `auth.guard.ts` exists — there is
│                           #   no admin/role guard (see §11).
├── interceptors/            # The REAL active auth interceptor lives here, not in core/
│                           #   (see §11 — this is the single most important gotcha in this file).
├── layout/                  # Header, footer, and other app-shell chrome.
├── models/                  # Wire/domain model interfaces. Barrel (`index.ts`) is
│                           #   INCOMPLETE — see §9.5 before assuming a type is exported from it.
├── pages/                   # ~40 routed page components. Flat by feature name, one folder
│                           #   each; dialogs/sub-components that belong to one page live
│                           #   co-located inside that page's folder rather than in shared/.
├── services/                # Global, app-wide services (`providedIn: 'root'`). Barrel
│                           #   (`index.ts`) only covers 13 of the 21 files here — see §9.
├── shared/
│   ├── components/          # Small reusable standalone components used by ≥2 features
│   │                        #   (image cropper, share-profile dialog, recently-visited-profile)
│   ├── data/                 # Static reference data (country/dial-code list)
│   ├── directives/           # `SelectSearchDirective` — see §15
│   ├── modules/               # `MaterialModule` — the one place Material modules are imported
│   └── utils/                 # Small pure-function helpers (crypto, relative-time, select-search keydown)
├── app.config.ts            # Bootstrap providers — THIS is where you confirm which
│                           #   interceptors are actually registered (see §11).
├── app.routes.ts            # Single source of truth for routing — see §5.
├── app.ts                   # Root component.
└── main.ts                  # Bootstrap entry point.
```

**Co-location convention**: a dialog, sub-form, or small helper component used by exactly one page lives *inside that page's own folder* (e.g. `pages/edit-profile/weight-entry-dialog/`), not under `shared/components/`. Promote something to `shared/components/` only once a second consumer actually needs it (that's literally how `ImageViewerDialogComponent` and `RecentlyVisitedProfileComponent` ended up shared — they started single-use and grew a second caller).

---

## 5. Routing Architecture

`app.routes.ts` is lazy-loaded almost entirely via `loadComponent`. Exactly **one** route is eager (`auth/verifyemail/:userGuid/:verificationCode` → `VerifyEmailComponent`, imported directly at the top of the file), and exactly **two** routes use `loadChildren` (`testimonials` → `features/testimonials/testimonials.routes.ts`, and `personality` → `features/personality/personality.routes.ts`, guarded by `authGuard` on the parent). The wildcard `**` → `NotFoundComponent` must stay last.

The only guard in the entire route table is **`authGuard`** (`src/app/guards/auth.guard.ts`) — a `CanActivateFn` that checks `AuthService.authenticated()` and, if false, redirects to `/login?returnUrl=<attempted-url>`. **There is no role/admin guard** — every `/admin*` route is reachable by any authenticated (sometimes any *unauthenticated*) user at the routing layer; admin pages gate themselves internally via the `AuthService.isAdmin` computed signal inside `ngOnInit`. If you add an admin feature, don't assume the router protects it — check (or add) that in-component check yourself.

### Public (no guard)
`about`, `contact`, `privacy-policy`/`privacy`, `terms-of-service`/`terms`, `faq`, `help`, `safety-tips`, `service-unavailable`, `success-stories`, `register`, `login`, `forgot-password`, `registration-success/:paramKey`, `auth/verifyemail/...` (eager).

### Public but auth-aware (guests get a reduced experience, not a redirect)
`` (home), `search`, `profile-view/:id` / `view/:id` (same component, `data.profileType` distinguishes `'profile'` vs `'view'` — this changes whether `ProfileService.getProfileById` calls `getProfileById` or `getProfileByCode` under the hood, so **id semantics differ by route**: `/profile-view/:id` expects a `userId`, `/view/:id` expects a `profileCode`), `profile-match/:id`, `horoscope-match/:matchUserId`, `accept/:interestId/:guid`. `premium` is also effectively public — its `authGuard` is commented out in the route definition, deliberately.

### Authenticated member pages (`canActivate: [authGuard]`)
`profile`, `profile/edit`, `settings`, `matchmaking` (+ `:profileId`), `compare`, `shortlist`, `recently-visited`, `chat`, `premium/payment`, `match-tracker`, `gallery` (+ `:profileId`), `notifications`, `feedback`, `match-fixed/new|me|:id/edit`, `admin/search-analytics`, `personality` (+ `assessment`, `result`, `result/:profileId`, `compatibility/:profileId` — these `:profileId`s are **profile ids** (`UserProfile.id`), not userIds).

### Admin (no router-level guard — see warning above)
`admin`, `admin/feedback`, `admin/edit-profile/:id`, `match-fixed/admin`, plus `testimonials/admin*` (nested under the `loadChildren` tree, also unguarded).

**When you add or move a route**: update `app.routes.ts` first, then cross-check every place that `routerLink`s to it (grep, don't guess) — this app has already accumulated two id-semantics-mismatched routes (`/profile-view` vs `/view`) from exactly this kind of drift.

---

## 6. Page Component Catalog

One line each — read the file itself for details; this is an index, not a spec. (Co-located dialogs/sub-components are not enumerated individually; folders with several are flagged.)

| Component | Path | Responsibility |
|---|---|---|
| `HomeComponent` | `pages/home/home.ts` | Public landing page — banner carousel, featured profiles, composes 5 sub-features (success stories, stats, testimonials, recently-visited). |
| `SearchComponent` | `pages/search/search.ts` | Main browse/search page — traditional filters + AI search, guest result-capping. 4 co-located sub-components + 1 dialog under `search/components/`. |
| `ProfileViewComponent` | `pages/profile-view/profile-view.component.ts` | Public-facing detailed profile viewer (by id or code — see §5 id-semantics note). 1 co-located dialog. |
| `ProfileMatchComponent` | `pages/profile-match/profile-match.component.ts` | Self-contained compatibility-report engine + PDF export (co-located `pdf-report.service.ts`). |
| `MatchmakingComponent` | `pages/matchmaking/matchmaking.ts` | AI-match suggestion feed, self or `:profileId`. |
| `MatchTrackerComponent` | `pages/match-tracker/match-tracker.ts` | Visualizes a match's funnel stage (Suggested → Shortlist → Interest → Chat). |
| `CompareComponent` | `pages/compare/compare.ts` | Side-by-side comparison of up to 4 `MatchResult`s. |
| `ShortlistComponent` | `pages/shortlist/shortlist.ts` | Shortlisted / interested / connected lists. |
| `HoroscopeMatchComponent` | `pages/horoscope-match/horoscope-match.component.ts` | Kundli compatibility report; renders `BirthChartComponent`. **Several fields in `horoscope-match.model.ts` are declared required but the API can omit them** — see §19. |
| `ChatComponent` | `pages/chat/chat.ts` | Messaging UI + calling entry point (`CallingService`). Supports `?profileId=` deep-linking to preselect a conversation. |
| `RegisterComponent` | `pages/register/register.ts` | 4-step registration wizard; handles the "email already exists → auto-login + prefill" case. |
| `EditProfileComponent` | `pages/edit-profile/edit-profile.ts` | Full profile editor, 9 sections; 1 co-located dialog (weight entry). |
| `ProfileComponent` | `pages/profile/profile.ts` | Own-profile dashboard; 2 co-located dialogs (mobile verification, voice intro — also reused by `EditProfileComponent`). |
| `GalleryManagementComponent` | `pages/gallery/gallery-management.component.ts` | Photo gallery manager; 2 inline dialog components in the same file. |
| `RecentlyVisitedComponent` | `pages/recently-visited/recently-visited.component.ts` | Thin page wrapper around the shared `RecentlyVisitedProfileComponent` — see §16. |
| `NotificationComponent` | `pages/notifications/notification.component.ts` | Email-notification inbox, via co-located `EmailHistoryService` (⚠ file is named `notification.service.ts` — easy to confuse with the global `NotificationService`). |
| `SettingsComponent` | `pages/settings/settings.ts` | Password change, privacy/notification toggles, deactivate/delete. |
| `PremiumComponent` / `PremiumPaymentComponent` | `pages/premium/premium.ts`, `pages/premium-payment/premium-payment.ts` | Plan picker + simulated checkout (`payment.service.ts` — **no real payment gateway**). |
| `LoginComponent` | `pages/login/login.ts` | Password + passwordless-OTC login. |
| `ForgotPasswordComponent` | `pages/forgot/forgot-password.ts` | Multi-step password reset. |
| `VerifyEmailComponent` | `pages/verify/verify-email.component.ts` | The one eager-loaded route. |
| `AcceptInterestComponent` | `pages/accept-interest/accept-interest.component.ts` | "Accept interest" email-link landing page. |
| `RegistrationSuccessComponent` | `pages/registration-success/registration-success.component.ts` | Post-registration confirmation; decrypts an email param. |
| `FaqComponent`, `SafetyTipsComponent`, `HelpCenterComponent` | `pages/faq/`, `pages/safety-tips/`, `pages/help-center/` | Informational content (static, API-backed-with-fallback, and composed-sub-components respectively — three different patterns for "same kind of page", be aware before copying one as a template for the others). |
| `AboutUsComponent`, `ContactComponent`, `PrivacyPolicyComponent`, `TermsOfServiceComponent` | `pages/about-us/`, `pages/contact/`, `pages/privacy-policy/`, `pages/terms-of-service/` | Static/marketing pages. |
| `FeedbackComponent` | `pages/feedback/feedback.component.ts` | User feedback submission (distinct from `admin/feedback`'s moderation view and from testimonials). |
| `NotFoundComponent`, `ServiceUnavailableComponent` | `pages/not-found/`, `pages/service-unavailable/` | 404 and maintenance/down states. |
| `AdminComponent`, `AdminLayoutComponent`, `AdminAiSearchAnalyticsComponent`, `AdminEditProfileComponent` | `pages/admin/`, `pages/admin-edit-profile/` | See §7 — admin is scattered, this is only part of it. |

---

## 7. Feature Modules (`src/app/features/`)

These are the model to follow for any new feature of comparable size — self-contained with their own routes/services/models, not spread thin across `pages/`.

- **`features/testimonials/`** — the most complete example. Has its **own child router** (`testimonials.routes.ts`, mounted at `/testimonials` via `loadChildren`), its own `pages/`, `components/`, `dialogs/`, `services/` (3), `models/`, `enums/`, `pipes/`. Covers member reviews/testimonials *and* a full moderation workflow (`pages/admin/{pending,reported,approved,featured}-reviews`) — that admin sub-tree is **unguarded at the router level**, same caveat as §5.
- **`features/match-fixed/`** — "Match Fixed" (arranged-match / success-story outcome) CRUD, public success-stories showcase, and its own admin dashboard. Routed directly from the top-level `app.routes.ts` (not via its own child router, unlike testimonials). Also owns `ImageViewerDialogComponent` — a lightbox reused well beyond this feature (profile-view, profile-match, search, gallery, horoscope-match all use it).
- **`features/chatbot/`** (`AiChatbotComponent` + `ChatbotService`) — a support/assistant chat widget, entirely separate from member-to-member messaging (`ChatComponent`/`ChatService`). Session persisted to `localStorage`, scoped to auth state. Don't confuse the two "chat" systems.
- **`features/calling/`** — `active-call.component.ts` / `incoming-call-dialog.component.ts`, the UI layer over `CallingService`/`WebRtcService`.
- **`features/personality/`** — Aurora Personality Assessment (backed by `suhana-api`'s `personality` module via the "Personality Assessment" section of `ApiService`). Own child router; `pages/` (home, assessment, result, compatibility), presentational `components/` (`PersonalityResultComponent`, `PersonalityCompatibilityComponent`, question card, score ring, type badge, dimension bar), `PersonalityService` (signals; caches the member's result; resets on user change; saves in-progress answers to `localStorage` under `suhana_personality_draft_<userId>`). Wire types in `models/personality.model.ts` mirror the backend DTOs. Entry points: header user menu, a "Personality Match" button on `profile-view`, and the reusable `PersonalityPromptComponent` (`components/personality-prompt/`) — `variant="card"` on `/profile` (invite → resume → result summary) and a dismissible `variant="banner"` on `/matchmaking` (own matches only; snoozed 7 days per user via `suhana_personality_prompt_<placement>_<userId>`). The prompt collapses its own host (`display: none`) when there's nothing to show, so host-page margins are safe.
  - **Profile pages**: `PersonalityService.getMatchStatus(theirProfileId)` resolves the viewer↔member standing (`ready | self-missing | other-missing | both-missing | self`; hosts set `guest` themselves) and feeds the presentational `PersonalityMatchPanelComponent` (`mode="full"|"compact"`). `profile-view` adds a clickable personality hero chip + a **Personality** tab (index 4, before the conditional Horoscope tab; signed-in viewers only). `profile-match` adds a personality pill under the main ring + a **Personality** tab (index 2 — `PERSONALITY_TAB_INDEX` in each component must match the template).
  - **Search results**: signed-in responses from `GET /profiles` and `POST /search/ai` carry `personalityType` (batched server-side — never fetch per card). `SearchComponent` renders it with `PersonalityTypeChipComponent` (`variant="overlay"`, bottom-left of the card photo); the chip renders nothing for members without a type, so those cards are unchanged.
  - **Personality is deliberately NOT blended into `generateMatchReport()`'s `overallPercentage`** — it's shown as a second lens, with `combinedInsight()` (`utils/personality.utils.ts`) turning the two scores into a plain-language takeaway. Note the existing "Emotional Compatibility" category is age-gap-based and "Lifestyle" includes a userId-seeded pseudo-random offset; if personality is ever folded into the score, replacing "Emotional" when both members have results is the natural place, and the PDF report (`pdf-report.service.ts`) would need the same change.

---

## 8. Shared Components, Directives, Utilities (`src/app/shared/`)

| Item | Path | Purpose |
|---|---|---|
| `ImageCropperDialogComponent` | `shared/components/image-cropper-dialog/` | Wraps `ngx-image-cropper` for photo crop/resize before upload. |
| `RecentlyVisitedProfileComponent` | `shared/components/recently-visited-profile/` | See §16 — the reference pattern for "reusable component + its own service + a standalone page wrapper". |
| `ShareProfileComponent` | `shared/components/share-profile/` | Share-a-profile dialog (email form + WhatsApp/email-client quick-share). Several hard-won gotchas live here — see §19. |
| `SelectSearchDirective` (`appSelectSearch`) | `shared/directives/select-search.directive.ts` | Pairs with the global `.select-search-box` CSS pattern (§20) to add an inline filter box inside a long `<mat-select>` panel. |
| `select-search.util.ts` | `shared/utils/` | `onSelectSearchKeydown()` — lets Arrow/Enter/Escape/Tab reach the `mat-select` while typing in that filter box. |
| `relative-time.util.ts` | `shared/utils/` | `timeAgo()` — "Just now" / "N mins ago" / "Yesterday" / falls back to a date past a week. |
| `crypto.util.ts` | `shared/utils/` | AES encrypt/decrypt (`encryptValue`/`decryptValue`), keyed off `environment.cryptoSecret`. |
| `countries.ts` | `shared/data/` | Static country/ISO2/dial-code list for phone-number pickers (a *different*, flatter shape than the `getCountries()`/`getCountryStates()` API-backed country/state picker used in Register/Edit-Profile location fields — don't conflate the two "country" data sources). |
| `MaterialModule` | `shared/modules/material.module.ts` | The single place Material modules are imported — re-exports Button, Icon, Card, Chips, FormField, Input, Select, Stepper, Checkbox, Radio, Datepicker, **Timepicker**, NativeDate, Divider, Toolbar, Menu, Badge, Tabs, Table, ProgressBar, Tooltip, ButtonToggle, Slider, Expansion, SlideToggle, ProgressSpinner, Dialog, SnackBar, Ripple, List. Add new Material modules here, not ad hoc in a component. Notably **absent**: Autocomplete, Paginator, Sort, Tree, BottomSheet — add explicitly if a feature needs one. |

---

## 9. Service Catalog (`src/app/services/`)

21 files, all `providedIn: 'root'`. The barrel (`src/app/services/index.ts`) exports only **13 of them** — `ApiService, AuthService, ProfileService, MatchService, ChatService, SearchService, AdminService, GalleryService, WebSocketService, InterestService, HeartbeatService, NotificationService, ProfileVisitService`. The other 8 must be imported by direct relative path:

| Not barrel-exported | Purpose |
|---|---|
| `ai-search.service.ts` (`AiSearchService`) | Natural-language search, debounced suggestions, intent chips |
| `admin-search-analytics.service.ts` (`AdminSearchAnalyticsService`) | Admin AI-search-analytics dashboard data |
| `calling.service.ts` (`CallingService`) | Call signaling/state (see §17) |
| `webrtc.service.ts` (`WebRtcService`) | Raw `RTCPeerConnection` wrapper, fed by `CallingService` |
| `common.service.ts` (`CommonService`) | Shared error-to-snackbar handling + small helpers (`cardBg()`, `hasMobile()`, `isNullOrEmpty()`) — used constantly across pages for profile-card background images |
| `mobile-verification.service.ts` | Mobile OTP flow |
| `profile-trust-indicator.service.ts` | Single-method wrapper for the trust-badge API |
| `voice-introduction.service.ts` | Single-method wrapper for voice-intro upload |

### Co-located services (outside `src/app/services/`) — 11 total, not 2
| Service | Path |
|---|---|
| `ContactService` | `pages/contact/contact.service.ts` |
| `HelpCenterService` | `pages/help-center/help-center.service.ts` (mock data behind the future real-API shape) |
| `HoroscopeMatchService` | `pages/horoscope-match/horoscope-match.service.ts` |
| `EmailHistoryService` | `pages/notifications/notification.service.ts` ⚠ **file name collides with the global `NotificationService`** — they are unrelated classes |
| `PaymentService` | `pages/premium-payment/payment.service.ts` (simulated, no real gateway) |
| `PdfReportService` | `pages/profile-match/pdf-report.service.ts` |
| `SafetyTipsService` | `pages/safety-tips/safety-tips.service.ts` |
| `FeedbackService` | `admin/feedback/feedback.service.ts` |
| `ChatbotService` | `features/chatbot/chatbot.service.ts` |
| `MatchFixedService` | `features/match-fixed/match-fixed.service.ts` |
| `AdminReviewsService`, `ReviewsService`, `SuccessStoriesService` | `features/testimonials/services/` |

### §9.5 — `src/app/models/` barrel is incomplete, don't trust it blindly
| File | In `models/index.ts`? |
|---|---|
| `user.model.ts` | **No** — the barrel line is `export {} from './user.model';`, an empty re-export that exports nothing. Every consumer imports this file directly by path. |
| `gallery.model.ts` | Yes, fully. |
| `profile-visit.model.ts` | Yes, fully. |
| `admin-search-analytics.model.ts` | No — import directly. |
| `ai-search.model.ts` | No — import directly. |

**When adding a new model file, import it directly by path in consuming code** (matching actual practice) rather than assuming the barrel covers it — then optionally add it to the barrel too, but don't rely on the barrel being complete.

---

## 10. `ApiService` (`src/app/services/api.service.ts`)

~111 public methods, ~147 HTTP calls, all under `` `${environment.apiUrl}/v1/...` `` (the one exception: `healthCheck()` → `/v1/health` with `responseType: 'text'`). It's a **flat list grouped only by `//` comment headers**, not sub-namespaced classes — CLAUDE.md's own coding-conventions section below asks for logical grouping in new additions; that's aspirational for *new* code, the existing 111 methods are not organized that way and a refactor hasn't happened.

Section headers, in file order: Auth · Token · Profiles · Matches · Shortlist · Chat · Interests · Calls (premium) · User online status · Connected profiles for chat list · Premium · Admin · Email history / notification center · Lookup values · Countries / States · Notifications · Feedback (user) · Feedback (admin) · Settings · Users · Match Fixed (profile-scoped / public / admin) · Profile share · Profile share by guest · Contact · Safety Tips (public / admin) · Mobile Verification · Voice Introduction · Profile Trust Indicator · AI Search · Search Analytics (admin) · Profile Visits.

When adding a method: find the matching section header and add it there, in the same thin-wrapper style (`return this.http.get/post/patch/put/delete(...)`). Don't create a new per-feature API service class — this app's convention is one flat `ApiService`, even though it's gotten large.

---

## 11. Authentication & Session Architecture — read this before touching anything auth-related

**`AuthService`** (`src/app/services/auth.service.ts`) owns session state: `user`/`authenticated` signals, `login`/`register`/`logout`/OTC-login/password-reset methods, and role resolution (`isAdmin`/`isTester`/`isPremium` computed from a `GET /role` fetch, with `currentUser.role` as a fallback). It stores the session directly in `localStorage` under three keys: **`suhana_token`**, **`refresh_token`**, **`suhana_user`**.

**`AuthService` does NOT use `TokenService`.** This is the single most important thing to know before making any change near auth:

- `core/services/token.service.ts` (`TokenService`) is a **separate** token store, keyed on `lrpd_opr` (not `suhana_token`!) + `refresh_token`, with JWT-expiry helpers. It has its own, disconnected notion of "the current token."
- `core/services/token-expiry.service.ts` (`TokenExpiryService`) polls `TokenService` every 2 minutes and shows a SweetAlert2 "session expiring" prompt — this is the **only** place that bridges the two token stores (it calls `ApiService.refreshToken` and `AuthService.logout()` directly).
- **There are two files both named `auth.interceptor.ts`, in different folders, one dead:**
  - `core/interceptors/auth.interceptor.ts` → class `AuthInterceptor1` (old class-based `HttpInterceptor`, uses `TokenService`). **Not registered anywhere — dead code.** Do not "fix" it thinking it's live; delete-or-ignore, don't extend it.
  - `src/app/interceptors/auth.interceptor.ts` (top-level `interceptors/`, **not** under `core/`) → functional `authInterceptor`. **This is the real, active one** — registered in `app.config.ts`: `provideHttpClient(withInterceptors([httpErrorInterceptor, authInterceptor]))`. It skips the auth header on public auth/health/refresh routes, attaches `Authorization: Bearer <suhana_token>` everywhere else, queues concurrent requests behind a single in-flight token refresh on 401, and on refresh failure clears all three `localStorage` keys and navigates to `/login` — but only if a session existed in the first place, so guest/public pages aren't bounced on an incidental 401.
  - `core/interceptors/http-error.interceptor.ts` → functional `httpErrorInterceptor`, also registered. Redirects to `/service-unavailable` on network-down/503/504, logs other errors, and always re-throws so `authInterceptor` still gets to inspect 401s.
- **`core/error-handling/global-error-handler.ts`** (`GlobalErrorHandler`) is the app-wide `ErrorHandler` — shows a snackbar for uncaught errors, suppressing `ExpressionChangedAfterItHasBeenCheckedError` noise and recursive-error loops.

**Guards**: only `authGuard` (`src/app/guards/auth.guard.ts`) exists. There is no role/admin guard anywhere in the codebase — see the warning in §5.

---

## 12. Real-Time Architecture — two separate transports, don't conflate them

1. **`WebSocketService`** (`services/websocket.service.ts`) — a plain native `WebSocket` (not Socket.IO), URL derived from `environment.apiUrl` (http→ws, `/api` suffix stripped), token as a query param, auto-reconnect with backoff (3s → ×1.5, capped 30s, gives up after 3 consecutive failures). Exposes one multiplexed `events` observable via `ofType<T>(eventType)`. `WS_EVENTS` constants: `MESSAGE_NEW/READ/DELIVERED`, `TYPING_START/STOP`, `USER_ONLINE/OFFLINE`, `INTEREST_RECEIVED/ACCEPTED`, `CALL_INCOMING/ENDED`. Consumed by `ChatService` and `NotificationService`.
2. **`CallingService`** (§17) owns its **own**, independent Socket.IO connection to a dedicated `/calls` namespace, purely for call signaling (offer/answer/ICE candidates). It does not go through `WebSocketService` at all.

If a feature needs a new real-time event, decide deliberately which of these two stacks it belongs to — don't add a third.

---

## 13. Search Architecture

Two parallel, independent search systems on the same `SearchComponent` page:
- **Traditional** (`SearchService`) — filter-driven, server-paginated, debounced, with a hard `GUEST_RESULT_LIMIT` for unauthenticated users.
- **AI** (`AiSearchService`) — natural-language query → extracted `SearchIntent` → results, with debounced typeahead suggestions, removable "intent chips" (e.g. drop the "age 25-30" facet and re-search), and confidence scoring. Backed by `POST /v1/search/ai` + `/v1/search/ai/suggestions` (see `ai-search.model.ts`, which documents itself as "mirrors `suhana-api/.../ai-search.dto.ts`" — the convention to copy for any new wire-model file).

`SearchComponent` composes 4 sub-components from `pages/search/components/` (ai-search-box, ai-intent-chips, ai-suggestions-panel, search-within-results) plus a guest-prompt dialog.

---

## 14. Matchmaking & Match Lifecycle

`MatchService` is the center of gravity: generates/scores matches (API-first with a local mock-compatibility-scoring fallback when the API is unavailable — `generateMatches`/`loadAllMatches`), and drives the status lifecycle `suggested → shortlisted → interested → connected` (plus `skipped`/`reconsidered`). `MatchTrackerComponent` visualizes this funnel; `CompareComponent` compares up to 4 side by side; `ShortlistComponent` lists by status; `ProfileMatchComponent` is the deep compatibility-report view for one pair.

**Gotcha**: the funnel's step-index mapping (`currentStep` 0–3) and the string `status` field are two parallel representations of the same thing from the backend — a UI that reads `currentStep` and one that reads `status` can disagree if only one is updated optimistically. `MatchTrackerComponent`'s local "advance step" logic bumps `currentStep` directly rather than relying on a refetch — be aware of this when touching either field.

---

## 15. UI Composition Patterns Worth Knowing Before You Build Something Similar

- **Searchable `<mat-select>`**: put a `.select-search-box` div (icon + borderless input) as the mat-select's first child, pair it with `[appSelectSearch]` (`SelectSearchDirective`) and `(keydown)="onSelectSearchKeydown($event)"` on the filter input. Used across Register/Edit-Profile (education, occupation, country, state) and Recently-Visited. The directive exists specifically to stop Material's own typeahead from hijacking keystrokes meant for the filter box.
- **"Other / Others" custom-entry dropdown**: append a trailing `Others` sentinel to a lookup list; on selection, reveal an inline text input + Add button; on Add, splice the typed value into the list (de-duplicated) ahead of the sentinel and select it. A `notLiteralOtherValidator` blocks submitting the literal sentinel string. Implemented independently (slightly differently) in `register.ts` and `edit-profile.ts` — not yet extracted to a shared util despite being near-identical; worth doing if a third consumer shows up.
- **Inline shimmer skeleton**: a `@keyframes` linear-gradient sweep (`background-position` animation), no library — see `recently-visited-profile.scss`'s `.rvp-sk*` classes or `safety-tips.component.scss`'s `.st-sk*` for the template.
- **Inline confirm dialog**: for a destructive action ("Clear History", "Delete Photo"), define a tiny standalone dialog component *in the same file* as the feature that uses it (see `GalleryManagementComponent`'s `DeleteConfirmDialogComponent`, or `RecentlyVisitedProfileComponent`'s `ClearVisitHistoryDialogComponent`) rather than reaching for a shared generic confirm component — **there isn't one**, this is the established pattern.
- **Carousel**: no shared carousel component exists. `RecentlyVisitedProfileComponent`'s is a hand-rolled `overflow-x: auto` + `scroll-snap-type: x` track with chevron buttons calling `scrollBy()` — no swipe-gesture library is installed (`HammerJS` is not a dependency). `FeaturedSuccessStoriesComponent` instead uses a totally different single-active-slide (`display`-toggled) technique. Pick one deliberately; don't assume either is "the" carousel pattern.

---

## 16. Recently Visited Profiles — reference example for "component + service + standalone page"

This is the most recently built, most completely-documented feature, and a good template to copy for a similarly-shaped feature:
- **Model**: `models/profile-visit.model.ts` (mirrors the backend `profile-visits` DTOs exactly).
- **Service**: `services/profile-visit.service.ts` (`ProfileVisitService`) — holds `profiles`/`stats`/`loading`/`error` signals; optimistic delete/clear with rollback on failure.
- **Reusable component**: `shared/components/recently-visited-profile/` — `viewMode: 'carousel' | 'grid' | 'list'` input (`'list'` currently renders as `'grid'`, not yet a distinct layout), `showStats`/`showHeader`/`showActions`/`limit` inputs. Binds straight to the service's own signals rather than duplicating local state — safe because only one instance is ever on-screen at a time (different routes/sections).
- **Standalone page**: `pages/recently-visited/` — thin wrapper embedding the shared component in grid mode.
- **Embedded on `HomeComponent`**, gated with `[hidden]` (not `@if`) on the wrapping `<section>` so the component underneath stays mounted and keeps fetching — gating the *mount* itself on "has results" would create a chicken/egg problem (it could never fetch to find out). This is the pattern to copy any time a section should only show once async data proves non-empty but the component doing the fetching needs to stay alive to do that fetching.
- Navigates to a visited profile via **`/profile-view/<profileId>`** (the `userId`), not `profileCode` — see the id-semantics note in §5.

---

## 17. Audio & Video Calling

Real, implemented call states (not the generic `idle/ringing/connecting/connected/ended` — the actual union is): **`'idle' | 'outgoing-ringing' | 'incoming-ringing' | 'active'`** (`CallingService.callState`). Architecture:
- `CallingService` owns a dedicated Socket.IO connection to `/calls` (separate from `WebSocketService`), handling signaling events (`call:initiate/accept/decline/end/missed/offer/answer/ice-candidate/error`).
- `WebRtcService` is a thin, transport-agnostic `RTCPeerConnection` wrapper (`getLocalMedia`, `createOffer`/`createAnswer`, ICE handling, mute/camera toggle) — `CallingService` feeds it SDP/ICE over the socket and wires its `onIceCandidate`/`onRemoteStream` callbacks.
- UI: `features/calling/active-call.component.ts` (in-call overlay) and `incoming-call-dialog.component.ts`, invoked from `ChatComponent`.
- `getUserMedia` failures are mapped to user-actionable messages (`describeMediaError`: permission denied / device in use / no device found) rather than a generic error.

---

## 18. Admin Architecture — scattered across four locations, tied together only by a nav config

There is no single "admin module." Admin functionality lives in:
1. `src/app/admin/feedback/` — feedback moderation (top-level `admin/`, sibling of `pages/`, **not** under `pages/admin/`).
2. `src/app/pages/admin/` — the `/admin` hub itself (`admin.ts`), shared shell (`layout/admin-layout.component.ts`), and the AI-search-analytics dashboard (`ai-search-analytics/`).
3. `src/app/pages/admin-edit-profile/` — admin's full-profile editor for any member (a sibling of `pages/admin/`, not nested inside it).
4. `src/app/features/match-fixed/match-fixed-admin-dashboard/` and `src/app/features/testimonials/pages/admin/*` — each feature module's own admin sub-tree.

**`pages/admin/admin-nav.ts`** (`ADMIN_NAV`/`ADMIN_MODULES`) is the single source of truth tying these together cosmetically — both the admin hub's cards and `AdminLayoutComponent`'s sidebar render from this one array. **If you add a new admin screen, register it here** regardless of which of the four locations it physically lives in, or it won't appear in navigation at all.

---

## 19. Known Gotchas & Inconsistencies (hard-won — read before you hit them yourself)

- **Several `*.model.ts` interfaces declare fields as required that the real API can omit.** Found and fixed this session in `horoscope-match.model.ts` (`planetaryCompatibility`, `horoscopeGeneration`, `marriageProspects` are all now `?`/nullable after real runtime crashes) — but don't assume every other model file is accurate just because it compiles. TypeScript's structural typing only protects you if the model is actually honest about optionality; this codebase has a track record of models being more optimistic than the backend.
- **Angular's `[innerHTML]` sanitizer silently strips the `style` attribute** (it's not in the sanitizer's `HTML_ATTRS` allowlist) — a server-rendered HTML email/profile-card template with inline `style="..."` will render with no styling at all, no error, no warning. Fix is `DomSanitizer.bypassSecurityTrustHtml()` on content you actually trust (see `share-profile.component.ts`'s preview).
- **`SafeHtml.toString()` does not return the markup** — it returns a security-warning placeholder string. Don't try to read a `SafeHtml` value back out in TypeScript; keep the raw string around separately if you need both a sanitized-for-display version and a plain-text-extractable version (see `share-profile.component.ts`'s `buildEmailMessage()`, which rebuilds the content from the raw profile object instead of trying to reuse the HTML preview).
- **`mailto:` links cannot render HTML** — the `body` param is plain text only, by spec (RFC 6068), in every mail client. Don't try to pass HTML through it; convert to readable plain text first.
- **A `[disabled]="expr"` binding on the same element as `formControlName` conflicts with Reactive Forms** (Angular logs a warning and the two fight over disabled state) — and more subtly, **a disabled button never fires `click`, so it never marks its form touched, so `*ngIf`/`@if`-gated validation error messages that depend on `.touched` never get a chance to show**, even though the underlying guard (e.g. `if (form.invalid) return`) was working correctly all along. The fix used throughout this app: keep the button enabled, and put `(click)="form.markAllAsTouched()"` directly on it (see `register.html`'s step buttons, or the fix applied to `submit-review.page.html`). If a "Next"/"Submit" button looks like it's silently doing nothing on invalid input, check for this exact pattern before assuming the validator logic is broken.
- **CDK Stepper's `editable="false"` on a `mat-step` blocks *all* navigation into it — including the Back button, not just clicking its header.** `previous()`/`next()` both route through the same `selectedIndex` setter, which requires `step.editable` for any backward move. If "Back" silently does nothing, check for a stray `[editable]="false"` on the target step.
- **The `models/index.ts` barrel is incomplete** (§9.5) — don't assume a type is importable from `'../../models'` just because a sibling type is; check the barrel file itself.
- **`UserProfile.userId` holds the *profile* id (`profiles.id`), and `UserProfile.id` is never sent.** The backend's `ProfilesService.toProfileResponse` maps `userId: profile.id` and emits no `id` field — so `UserProfile.id` is always `undefined` at runtime even though the model declares it. This is also why `/profile-view/:id` "takes a userId": `GET /profiles/:id` actually looks up by profile id. The real account id is `UserProfile.user?.id`. Any API that wants a profile id (e.g. all `/personality/*` endpoints) must be given `userId` — use `profileIdOf()` from `features/personality/utils/personality.utils.ts`. Found when the personality tab/chip silently didn't render because they keyed off `p.id`.
- **Two files are both named `auth.interceptor.ts`** (§11) — one is dead. Always confirm via `app.config.ts`'s `provideHttpClient(withInterceptors([...]))` which interceptors are actually live, never by filename alone.
- **No dark mode support exists.** `body { color-scheme: light }` is hardcoded in `styles.scss`; there is no `@media (prefers-color-scheme: dark)` anywhere. Don't build a feature assuming dark-mode tokens will "just work."
- **`src/styles.scss` contains five dead, unused alternate color palettes** (selectors `:root1`–`:root4` plus the live `:root` — note `:root1` etc. are *never-matching* selectors, not a typo for `:root`, so they're inert by construction, not by oversight-that-still-executes). Don't accidentally "activate" one thinking it's the real theme; the live palette is the plain `:root` block.

---

## 20. UI Design System

**Brand tokens** (`:root` in `src/styles.scss` — this is the only live palette, see §19):
```
--suhana-rose-gold:          #b76e79    --suhana-maroon:              #800020
--suhana-rose-gold-light:    #d4a0a7    --suhana-maroon-bright:       #a40029
--suhana-rose-gold-lighter:  #f0d4d8    --suhana-maroon-bright-light: #c30061
--suhana-rose-light:         #ec88a9    --suhana-maroon-dark:         #5c0018
--suhana-rose-bright:        #da286e    --suhana-ivory:               #fffff0
--suhana-gold:                #c9a84c    --suhana-ivory-warm:          #fdf8f4
--suhana-gold-light:          #e8d5a0    --suhana-blush:               #fde8e8
--suhana-text-primary:  #3d2c2e    --suhana-text-secondary: #6b5557
--suhana-shadow: rgba(183,110,121,0.15)
--suhana-gradient:       linear-gradient(135deg, #b76e79 0%, #800020 100%)
--suhana-gradient-light: linear-gradient(135deg, #f0d4d8 0%, #fde8e8 100%)
--suhana-gold-gradient:  linear-gradient(135deg, #e1b651 0%, #b97002 100%)
```
Material 3 theming (`@use '@angular/material' as mat`) with `mat.$rose-palette` primary / `mat.$red-palette` tertiary, Roboto, density 0.

**Global utility classes** (`styles.scss`): `.suhana-container` (max-width 1280px, centered), `.suhana-section`/`.suhana-section-title`/`.suhana-section-subtitle` (page-section rhythm), `.suhana-btn-primary`/`.suhana-btn-outline` (pill buttons scoped to `.mat-mdc-raised-button`/`.mat-mdc-outlined-button` — **both explicitly restate their look under `&:disabled`**, because Material's own disabled styling would otherwise be silently overridden by the `!important` color/background rules; copy that pattern for any new `!important`-styled button class). `.select-search-box`/`.select-no-match` — the searchable-dropdown pattern (§15), global because several unrelated pages share it.

**Recent additions this session, worth knowing about as working examples**:
- **"Liquid glass" nav highlight** (`layout/header/header.scss`) — a single translucent pill (`.nav-glow`) glides between nav links via measured `offsetLeft`/`offsetWidth`, not per-link static hover backgrounds. Glass look comes from layered low-alpha gradients + a bright inset rim + a diagonal specular `::after` sheen — `backdrop-filter: blur()` alone does nothing useful against this app's solid-white toolbar, the gradient/shadow/border combination is what actually reads as "glass." Material's own button hover state-layer had to be explicitly zeroed (`--mat-text-button-hover-state-layer-opacity: 0` + hiding `.mat-mdc-button-persistent-ripple::before`) so it didn't muddy the custom highlight.
- Dense, accurate per-item info in a long card list reads better as a **catalog table** than as prose — this very file is an example of applying that at the documentation level, not just in UI.

---

## 21. Angular Coding Standards

- Standalone components only — no `NgModule`s anywhere in app code.
- Signals for component/service state; `computed()` for derived values; `effect()` sparingly (session saw real bugs from `computed()` reading non-signal sources like `FormGroup.value` directly — it won't re-run on form changes; convert via `toSignal(form.statusChanges, ...)` or an explicit signal instead).
- `ChangeDetectionStrategy.OnPush` everywhere.
- New Angular `@if`/`@for`/`@switch` control-flow syntax, not structural directives (`*ngIf`/`*ngFor`).
- `input()`/`output()` signal-based component I/O for new components (not the `@Input()`/`@Output()` decorators) — both styles exist in the codebase (older components use decorators), but new code should use the signal form.
- Reactive Forms (`FormBuilder`), not template-driven forms. Cross-field validation goes on the `FormGroup` itself as a `ValidatorFn` (not on individual controls) when it spans multiple fields *within* that group; when it spans fields in **sibling** groups (e.g. age-range rules depending on gender in one group and country in another, as implemented in `register.ts`/`edit-profile.ts`), the validator closure reads the sibling forms directly and the component wires `valueChanges` subscriptions on the sibling controls to call `updateValueAndValidity()` on the dependent group — Angular does not auto-revalidate across sibling `FormGroup`s.
- New API calls go through `ApiService` (§10) — never an ad hoc `HttpClient` call inside a component.
- Keep UI consistent with existing Material + `--suhana-*` token styling (§20).
- Every non-trivial UI change this session was verified with `npx tsc --noEmit -p tsconfig.app.json` **and** a full `npx ng build --configuration production` before being called done — the plain `tsc` check does not catch Angular template binding errors (wrong property names, type mismatches in `[prop]="expr"`, missing directives in a standalone component's `imports` array); only a real Angular build does.

---

## 22. Future Roadmap

**No committed, authoritative roadmap exists in this repository or in any CLAUDE-accessible source.** The items below are ideas that have been *floated* (by product direction or by this doc's own authoring prompt) — treat them as candidate directions to validate with whoever owns product decisions before starting implementation, not as backlog items with any priority or timeline:

- AI relationship-coaching UI; voice search; video introductions (the app already has voice introductions and video *calling* — a recorded video intro, separate from live calling, does not yet exist)
- Deeper admin analytics; an AI profile-completion assistant; real-time match notifications (push, not just the existing in-app notification center)
- WebRTC calling hardening (reconnection, group calls, call recording — none of which exist today)
- Progressive Web App support / offline mode (no service worker or offline strategy exists today)
- Extracting the duplicated "Other/Others custom-entry dropdown" logic (§15) into one shared util, since a third consumer would make the duplication worth resolving
- A genuine shared confirm-dialog component, if a fourth or fifth feature needs "are you sure?" (three independent implementations already exist — see §15)

---

## 23. Working Style Expected from Claude

When making code changes:

1. Work in small, verifiable steps.
2. Identify the exact files to modify before writing code.
3. Produce a **unified diff/patch** per file, not just prose description.
4. Include a short rationale (1–3 bullets).
5. Provide verification steps (dev server command, route to navigate, manual check).
6. Note risks/migration concerns if the change touches shared services (`ApiService`, `AuthService`, `ChatbotService`, or anything in §11's auth chain).
7. Propose a test outline (Jasmine/Karma, or `HttpClient` mocks) for new logic.
8. Before touching anything that looks like a model/DTO mismatch, check §19 first — there's a real chance it's already a known issue, and if it's a *new* one, add it there once fixed.

### Preferred output format

```
## Summary
<1–2 lines>

## Files Changed
- path/to/file.ts

## Diff
<unified diff per file>

## Rationale
- ...

## Verify
- npm start → navigate to /route → do X

## Risks / Migration Notes
- ...
```

## Constraints

- Do not change the DB schema unless explicitly asked.
- Do not modify backend code outside the specified endpoint(s) unless asked — the backend is a separate repository; verify its actual DTOs/controllers directly when a task depends on the real API contract rather than assuming this frontend's model files are accurate (§19).
- Never commit or print production secrets. `environment.ts` holds the API base — do not expose `cryptoSecret` or similar keys in generated code, diffs, or explanations.

## Notes for Cross-File Changes

For anything touching routing or lazy-loaded modules, always cross-reference `app.routes.ts` first and list every impacted route/module explicitly before proposing a patch. For anything touching auth, read §11 in full first — it is easy to edit the dead interceptor by mistake.
