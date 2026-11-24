# My Interests — Partner Interest Tracking & Compatibility Dashboard

Route: **`/my-interests`** (signed-in members; never indexed or prerendered).
One place to see who has expressed interest, viewed your profile or messaged you — with status, compatibility and the actions that are valid right now.

## 1. What already existed (reused, not rebuilt)

| Concern | Existing implementation |
|---|---|
| Explicit interest | `interests` table + `InterestsService` (send / accept / decline / accept-by-email-link). One row per sender→recipient pair. |
| Profile views | `profile_visits` (one row per visitor/profile, `visitCount`, `lastVisitedAt`, denormalised `visitedUserId`). |
| Messages | `messages` (`senderId`, `receiverId`, `isRead`) + `conversations`. |
| AI compatibility | `matches.matchPercentage` per pair. |
| Horoscope | `horoscope_compatibility_reports` — cached AI Kundli reports (valid while birth details unchanged). |
| Personality | `PersonalityService` + rule-based compatibility provider. |
| Block / report | `user_blocks`, `POST /user/:id/block`, `POST /user/:id/report`. |
| Notifications | Email + email-history notification centre (`EmailType.INTEREST_SENT/ACCEPTED`); `user_settings.emailInterests`. |
| Audit | Event-driven `audit_log` (`AuditEmitter`), risk engine already scores `INTEREST_SENT`. |

## 2. Gaps closed

- No screen showed received interests (only a pending list inside chat); no "who viewed me" view.
- Interests could not be **withdrawn**, had no **read/viewed** state, no **source**, no `updatedAt`.
- Accepting in the app did **not** open a chat or email the sender (only the email-link path did) — now one shared path.
- `user_settings.emailInterests` was ignored — interest emails now respect it.
- Interest sends were not audited (the risk engine's "interest blasting" rule never fired) — now audited.
- No block check when sending/accepting; no daily anti-spam cap; recipient could be missing → crash. Fixed.
- Header "Messages" badge was a hard-coded `3` — now the real unread count.

"Connection request" and "Introduction" are **not** separate concepts in this app: every interest carries an introduction message, and accepting it connects the pair. They are shown as one *Interest* type (the introduction can be expanded on the card) rather than inventing parallel types.

## 3. Database (migration `1784334200000-extend-interests-for-my-interests.ts`)

Extends `interests` (no new table):

| Change | Purpose |
|---|---|
| `status` enum + `'withdrawn'` | sender retracted a pending interest (row kept) |
| `isRead` tinyint(1) default 0, `readAt` | "New" → "Viewed" for the recipient |
| `respondedAt`, `withdrawnAt` | lifecycle timestamps |
| `source` varchar(32) | where the sender found the profile (reporting) |
| `updatedAt` datetime(6) | "Recently updated" sort |
| indexes `IDX_interests_to_created (toUserId, createdAt)`, `IDX_interests_from_created (fromUserId, createdAt)`, `IDX_interests_status` | dashboard reads |

Back-fill: answered rows → `isRead = 1`; `respondedAt = acceptedOn` for accepted; `updatedAt = createdAt`. Idempotent, with `down()`.
Runs automatically in development (`DB_MIGRATIONS_RUN=true`). ⚠ Production currently has `synchronize: NODE_ENV === 'production'` in `config/configuration.ts`, so TypeORM auto-syncs the prod schema from entities — review that setting; the migration is the safe path.

No compatibility snapshots are stored: scores are read live from the existing sources (cheap batch queries).

## 4. API

**New (read model)** — `MemberInteractionsModule`, always scoped to the JWT user:
- `GET /v1/member-interactions/dashboard` → `{ totalInterestsReceived, newInterests, pendingRequests, acceptedConnections, profileViews, newMessages, sentPending }`
- `GET /v1/member-interactions?direction=received|sent&type=all|interests|profile_views|messages&status=all|new|viewed|pending|accepted|declined|withdrawn&compatibility=all|horoscope_excellent|horoscope_good|personality_match|ai_recommended|not_available&sort=newest|oldest|compatibility|updated&search=&page=&limit≤50`
  Each item: type, direction, status, introduction, source, partner card (no contact/address/family/birth data), compatibility (AI / horoscope / personality), and the **server-computed** list of valid actions.

**Existing interests endpoints (extended)**:
- `POST /v1/interests/send` — optional `source` (`PROFILE_VIEW | PROFILE_SEARCH | AI_MATCH | HOROSCOPE_MATCH | PERSONALITY_MATCH | RECOMMENDED_PROFILE | FEATURED_PROFILE | MY_INTERESTS | OTHER`); block check; 50 per 24 h cap (HTTP 429); re-opens a withdrawn interest.
- `PATCH /v1/interests/:id/accept` — now also opens the chat and emails the sender (same as the email link).
- `PATCH /v1/interests/:id/decline` — sets `respondedAt`.
- **New** `PATCH /v1/interests/:id/withdraw` (sender only, pending only) and `PATCH /v1/interests/:id/read` (recipient only, idempotent).

**Service helpers added**: `MatchesService.getCachedHoroscopeSummaries()` (cache only — never triggers a new AI report), `PersonalityService.getCompatibilitySummaries()` (batched, same provider).

## 5. Status model

| Stored `status` | Recipient sees | Sender sees | Actions |
|---|---|---|---|
| pending + unread | **New** | Awaiting reply | recipient: Accept / Decline · sender: Withdraw |
| pending + read | **Viewed** | Awaiting reply | same |
| accepted | Accepted | Accepted | Message |
| declined | Declined | Declined | — |
| withdrawn | Withdrawn | Withdrawn | — (sender may send again) |

Every transition is written to `audit_log` (`INTEREST_SENT / VIEWED / ACCEPTED / REJECTED / WITHDRAWN`). Rows are never deleted.

## 6. Compatibility (informational only — never gates interest or messaging)

- **AI**: `matches.matchPercentage` (0 = never scored → "Not available"). "AI recommended" = Aurora's matcher scored this pair.
- **Horoscope**: cached report only. `analyzed` → Guna score `x/36` + the report's own recommendation bucketed to Excellent / Good / Moderate / Low; `not_analyzed` → both have birth details but no report yet; `not_available` → birth details missing.
- **Personality**: my type ↔ their type + score/level when both completed the assessment; otherwise "Not available yet". No scores are invented.
- "Highest compatibility" sort uses the best available score (AI → personality → horoscope %); members with none sort last.

## 7. Frontend

`src/app/features/my-interests/`
- `models/member-interaction.model.ts` — mirrors the API DTOs
- `services/member-interactions.service.ts` — dashboard counts (header badge, refreshed every 3 min while signed in), filters, list, actions
- `pages/my-interests.page.*` — summary cards (click = filter), Received/Sent, search (debounced), type/status/compatibility/sort filters, pagination, loading/error/empty states; inline confirm + report dialogs
- `components/interest-card/*` — partner card, status badge, compatibility, contextual actions

Also: header nav **My Interests** (badge = new interests; desktop, mobile, user menu); real unread badge on **Messages**; `source` passed from search (`PROFILE_SEARCH`), profile view (`PROFILE_VIEW`), match report and match tracker (`AI_MATCH`). Opening an introduction, viewing the profile, accepting or declining marks a new interest as viewed.

## 8. Security & privacy

- JWT on every endpoint; no user id is accepted from the client for reads; every mutation checks the caller is the recipient/sender (403 otherwise).
- Blocked pairs (either direction) are excluded from lists and counts and cannot send/accept.
- Inactive accounts are excluded.
- **Photo privacy is enforced** in this API: photos show only when the member's setting is "everyone" or the pair is connected. (Note: the general profile/search APIs still return photos regardless of `photoPrivacy` — a pre-existing gap.)
- Partner payload is limited to card fields (no email, phone, address, parents' names or birth data).
- Anti-spam: 50 interests / 24 h per member (DB-counted, works across instances) + existing risk scoring.

## 9. Tests

- API: `interests.service.spec.ts` (send rules, block, 429 cap, source, re-open withdrawn, email opt-out, accept/decline/withdraw/read authorization & history) and `member-interactions.service.spec.ts` (status mapping, filters, actions, horoscope buckets, best score) — **37 passing**. Full suite: 307 pass; `app.controller.spec.ts` (Nest scaffold "Hello World") fails before and after this change.
- Real-DB checks (dev): migration applied; dashboard/list queries correct and < 100 ms; HTTP: 401 without token, 400 on invalid query/ids/source, **403 on accept/decline/withdraw/read of someone else's interest**, self-interest refused.
- Web: `tsc` + production build (prerender + SEO validation) pass; `/my-interests` redirects guests to login; nav link hidden for guests.
- **Not verified in a browser while signed in** — the signed-in dashboard UI (cards, filters, dialogs) still needs a manual pass.

## 10. Remaining / future

- Release 3 (not built): profile promotion/boost, engagement analytics, interest-source reports (the `source` column is ready).
- No real-time push (the API has no WebSocket server; badges refresh every 3 minutes and after actions).
- Declines send no email (no template exists; the sender sees "Declined" on their dashboard).
- No "incognito browsing" setting: profile views are always shown to the viewed member. Consider adding one.
- Interest expiry ("Expired" status) is not implemented — no business rule exists for it yet.
