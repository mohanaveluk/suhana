# CLAUDE.md

This file gives Claude Code the context it needs to work effectively in this repository.

## Project Overview

**Suhana** — Angular application which is a beautiful and elegant choice for your matrimony business! It conveys a sense of a joyful, smooth, and beautiful journey, which is perfect for matchmaking. It has features like AI-based matchmaking, horoscope matching, and video profiles.

- **Frontend:** Angular, using standalone components and signals (no NgModules, no RxJS-heavy state where signals suffice).
- **Backend:** REST API consumed via `ApiService`. Base URL comes from `environment.apiUrl` (see `environment.ts`).
- **Chatbot/AI:** Frontend calls the app's own backend at `/v1/chatbot` through `ChatbotService`. The backend proxies an LLM — Claude does not call any LLM provider directly from the frontend.

## Tech Stack

- Angular (standalone components + signals)
- TypeScript
- Jasmine/Karma for unit tests
- npm for package management

## Commands

| Task | Command |
|---|---|
| Start dev server | `npm start` (runs `ng serve`) |
| Production build | `npm run build` |
| Run unit tests | `ng test` (Jasmine/Karma) |

Always confirm these still match `package.json` scripts before relying on them — verify rather than assume if the file has changed.

## Architecture & Key Files

| Purpose | File |
|---|---|
| App bootstrap | `main.ts` |
| Root component | `app.ts` |
| Routing (lazy-loaded pages) | `app.routes.ts` |
| REST API client | `api.service.ts` |
| Chatbot client | `chatbot.service.ts` |
| Environment config | `environment.ts` |
| Auth | `auth.service.ts` |
| Chat/state services | `chat.service.ts`, `websocket.service.ts`, `heartbeat.service.ts` |
| Barrel export | `index.ts` |
| Scripts/deps | `package.json` |

Routing is **lazy-loaded** — `app.routes.ts` is the source of truth for which modules/components exist and how they're split. Any change that adds a route or page must be reflected here.

## Coding Conventions

- Use standalone components and Angular signals for new state — don't introduce NgModules or reach for RxJS where a signal is simpler.
- Keep UI consistent with the existing Material-based styling.
- New API calls go through `ApiService` (typed methods), not ad-hoc `HttpClient` calls in components.
- Group related API methods logically (e.g., profile-related methods under a clear namespace) rather than as a flat list.
- Chat/AI-related UI changes go through `chatbot.component.ts` and `chatbot.service.ts`.

## Working Style Expected from Claude

When making code changes, Claude should:

1. Work in small, verifiable steps.
2. Identify the exact files to modify before writing code.
3. Produce a **unified diff/patch** per file, not just prose description.
4. Include a short rationale (1–3 bullets).
5. Provide verification steps (dev server command, route to navigate, manual check).
6. Note risks/migration concerns if the change touches shared services (`ApiService`, `AuthService`, `ChatbotService`).
7. Propose a test outline (Jasmine/Karma, or `HttpClient` mocks) for new logic.

### Preferred output format

```
## Summary
<1–2 lines>

## Files Changed
- path/to/file.ts
- path/to/other.ts

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
- Do not modify backend code outside the specified endpoint(s) unless asked.
- Never commit or print production secrets. `environment.ts` holds the API base — do not expose `cryptoSecret` or similar keys in generated code, diffs, or explanations.

## Example Tasks (for calibration, not exhaustive)

- **Feature:** Add a "Mark as favourite" button on the profile view — modify `ProfileViewComponent`, add a helper method in `api.service.ts`, keep Material styling, reference `app.routes.ts` for navigation context.
- **Bugfix:** Intermittent error sending chatbot messages — inspect `chatbot.component.ts` and `chatbot.service.ts` error handling; propose a single retry before fallback; fix `saveSession` to avoid corrupting `localStorage` (wrap `JSON.stringify` in try/catch, fall back to trimmed history).
- **API integration:** Add `GET /v1/profiles/recommended` — typed method in `api.service.ts`, consumed by `MatchService`, exposed on the home page. Provide TS signature, expected JSON shape, and a mocked-`HttpClient` unit test.
- **Refactor:** Group `ApiService` profile methods under a `profiles` namespace while preserving the public API — provide migration steps and tests.
- **Chatbot UX:** Improve the assistant's reply to "How do I register?" — update backend prompt templates if present, and update `SUGGESTED_QUESTIONS` in `chatbot.component.ts`.

## Notes for Cross-File Changes

For anything touching routing or lazy-loaded modules, always cross-reference `app.routes.ts` first and list every impacted route/module explicitly before proposing a patch.
