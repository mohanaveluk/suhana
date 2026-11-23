# Aurora Matrimony — SEO Implementation

**Site:** https://www.auroramatrimony.com · **Brand:** Aurora Matrimony — *Where Forever Begins*
**Scope:** web app (`suhana/`, Angular 21) and API (`suhana-api/`, NestJS).

---

## 1. Existing SEO assessment (before this work)

| Area | Finding |
|---|---|
| Rendering | Pure client-side rendering (CSR). Every URL returned the same `index.html` with an empty `<app-root>` — no headings or text in the HTTP response. |
| Titles / meta | One static `<title>Aurora</title>` for every page. No meta description, robots, canonical, Open Graph or Twitter tags. |
| Structured data | None. |
| robots.txt / sitemap | Neither existed. nginx served the app shell (HTTP 200) for `/robots.txt` and `/sitemap.xml`. |
| Indexing / privacy | Member pages (`/view/:code`, `/profile-view/:id`, `/search`) are viewable by guests and carried no `noindex`. Nothing prevented member names/photos from being indexed. |
| Duplicate URLs | `/privacy` + `/privacy-policy`, `/terms` + `/terms-of-service`, `/testimonials` + `/testimonials/reviews`, `/home-v2` served full duplicate pages. |
| Landing pages | No public pages for AI matchmaking, horoscope matching, personality matching or community searches. Footer links "AI Matchmaking" and "Personality Assessment" pointed at sign-in-only pages. |
| Blog | The API had a blog module, but every endpoint required a login; the web app had no blog pages. |
| Images | Hero banners were 2.0–2.6 MB PNGs used as CSS backgrounds (largest-contentful-paint cost). |
| Analytics | No GA4 / GTM. |
| Hosting | nginx (static) in Docker on Cloud Run; no Node server. |

## 2. What was implemented

1. **Build-time prerendering** (Angular `outputMode: "static"` — no Node server needed): 22 public pages ship as complete HTML with their content, headings, links and SEO tags. All other routes stay client-rendered.
2. **Central SEO layer** (`SeoService`): per-route title, description, robots, canonical, Open Graph, Twitter card and JSON-LD; replaced on every navigation, no duplicate/stale tags.
3. **Privacy-by-default indexing**: every route is `noindex` unless it explicitly opts in. The client-only app shell is `noindex` *in the initial HTML*, so profiles, search and account pages are never indexable — even before JavaScript runs.
4. **Build-time privacy guard**: while prerendering, only public blog API calls are allowed; member data can never be baked into static HTML. The post-build validator fails the build if a member photo URL or profile link appears in any prerendered page.
5. **10 SEO landing pages** (5 feature, 5 audience) with unique copy, FAQs, internal links and registration CTAs.
6. **Public blog**: list + article pages, public read-only API, live blog sitemap, IndexNow notifications.
7. **Structured data**: Organization, WebSite, BreadcrumbList, Service, FAQPage, BlogPosting.
8. **robots.txt, sitemap index, pages sitemap, blog sitemap**.
9. **nginx**: canonical host redirect, trailing-slash policy, 301s for duplicate URLs, cache headers, IndexNow key file.
10. **Images**: WebP banners (≈ 95 % smaller), a 1200×630 social share image and a square logo.
11. **Conversion tracking**: consent-gated GA4 (off until configured) with `cta_register_click`, `registration_start`, `sign_up`, `generate_lead`.
12. **Automated validation** (`npm run seo:check`, runs after every build).

## 3. New files

**Web app (`suhana/`)**
| File | Purpose |
|---|---|
| `src/app/core/seo/seo.model.ts` | `SeoData` type, brand constants, noindex default |
| `src/app/core/seo/seo.service.ts` | Head management (title/meta/canonical/OG/Twitter/JSON-LD) + router listener |
| `src/app/core/seo/structured-data.ts` | JSON-LD builders |
| `src/app/core/seo/page-seo.ts` | SEO copy for existing public pages |
| `src/app/core/analytics/analytics.service.ts` | Consent-gated GA4, sanitised page paths, conversion events |
| `src/app/core/analytics/consent-banner.component.ts` | Analytics cookie consent (only shown when GA4 is configured) |
| `src/app/core/interceptors/prerender-http.interceptor.ts` | Build-time API allow-list (public blog only) |
| `src/app/features/seo-pages/landing-pages.registry.ts` | Landing page slugs (routes, prerender, footer) |
| `src/app/features/seo-pages/landing-pages.content.ts` | Landing page copy, FAQs, related links |
| `src/app/features/seo-pages/landing-page.component.{ts,html,scss}` | Landing page template |
| `src/app/features/blog/*` | Blog model/slug helper, service, list page, article page, styles |
| `src/app/app.routes.server.ts` | Which routes are prerendered vs client-rendered |
| `src/app/app.config.server.ts`, `src/main.server.ts` | Prerender entry point (+ empty Web Storage shim) |
| `scripts/seo-postbuild.mjs` | Validator + sitemap/robots generator |
| `nginx/default.conf.template` | Production nginx config (replaces `nginx.conf` and `nginx/nginx.conf`) |
| `public/images/seo/aurora-matrimony-share.jpg`, `aurora-matrimony-logo.png` | Share image, structured-data logo |
| `public/banners/banner*.webp` | WebP hero banners |
| `docs/seo/blog-content-plan.md` | Editorial briefs for the first 12 articles |

**API (`suhana-api/`)**
| File | Purpose |
|---|---|
| `src/modules/blog/public-blog.controller.ts` | `GET /v1/public/blog/posts`, `GET /v1/public/blog/posts/:id` (published only, no auth) |
| `src/modules/seo/seo.module.ts`, `seo.controller.ts` | `GET /v1/seo/sitemap-blog.xml` |
| `src/modules/seo/indexnow.service.ts` | IndexNow notifications |
| `src/modules/seo/seo-url.util.ts` | `SITE_URL`, blog slug/path (must match the web app) |

## 4. Modified files

**Web app:** `angular.json` (server entry, `outputMode: "static"`), `tsconfig.app.json`, `package.json` (+`@angular/ssr`, `@angular/platform-server`; `postbuild`, `build-prod`, `seo:check`), `Dockerfile`, `Dockerfile.prod`, `src/index.html`, `src/environments/environment*.ts` (`siteUrl`, `ga4MeasurementId`), `app.ts`, `app.html`, `app.config.ts`, `app.routes.ts`, `features/testimonials/testimonials.routes.ts`, `layout/footer/*`, `services/api.service.ts`, `services/auth.service.ts`, `services/heartbeat.service.ts`, `services/calling.service.ts`, `core/interceptors/http-error.interceptor.ts`, `pages/home/home.{ts,html,scss}`, `pages/home-v2/home-v2.ts`, `pages/register/register.ts`, `pages/contact/contact.component.ts`, `features/match-fixed/success-stats/success-stats.component.ts`, `features/testimonials/pages/reviews/reviews.page.ts`.

**API:** `src/modules/blog/blog.module.ts` (public controller, `SeoModule`), `src/modules/blog/blog.service.ts` (IndexNow on create/update/delete, `updatedAt` in DTO).

**Removed:** `nginx.conf`, `nginx/nginx.conf` (identical; superseded by `nginx/default.conf.template`).

## 5. Public routes and search intent

| Route | Primary intent | Indexed |
|---|---|---|
| `/` | Indian matrimony / find a life partner (brand + category) | ✅ |
| `/how-it-works` | "how does online matrimony work" | ✅ |
| `/ai-matchmaking` | AI matchmaking for marriage | ✅ |
| `/horoscope-matching` | horoscope / Kundli matching for marriage | ✅ |
| `/personality-matching` | 16 personality type compatibility for marriage | ✅ |
| `/verified-profiles` | verified matrimonial profiles, safe partner search | ✅ |
| `/hindu-matrimony` | Hindu brides and grooms | ✅ |
| `/tamil-matrimony` | Tamil matrimony | ✅ |
| `/telugu-matrimony` | Telugu matrimony | ✅ |
| `/south-indian-matrimony` | South Indian (Tamil/Telugu/Kannada/Malayalam) matrimony | ✅ |
| `/nri-matrimony` | NRI matrimony | ✅ |
| `/matrimony-blog` | matrimony guides | ✅ once it has published articles (noindex while empty) |
| `/matrimony-blog/:id/:slug` | long-tail article intents | ✅ |
| `/about`, `/contact`, `/faq`, `/help`, `/safety-tips` | brand / support | ✅ |
| `/success-stories`, `/testimonials/reviews` | trust | ✅ |
| `/premium` | membership plans | ✅ |
| `/privacy-policy`, `/terms-of-service` | legal | ✅ |
| Everything else (profiles, search, matches, chat, settings, admin, auth, `/home-v2`, 404) | — | ❌ `noindex` |

Aliases (301 in nginx, redirect in Angular): `/privacy`, `/terms`, `/about-us`, `/contact-us`, `/membership-plans`.

## 6. Keyword mapping

| Page | Primary | Secondary / semantic | Long-tail answered |
|---|---|---|---|
| `/` | Indian matrimony | matrimonial website, brides and grooms, find a life partner | — |
| `/how-it-works` | how matrimony works | matrimonial profile, partner search, family involvement | "Is it free to register?", "Can my parents help?" |
| `/ai-matchmaking` | AI matchmaking | intelligent matrimonial search, compatible life partner, smart recommendations | "How does AI matchmaking help find a life partner?" |
| `/horoscope-matching` | horoscope matching for marriage | Kundli matching, Guna Milan, Ashtakoota, Rasi/Nakshatra, Manglik dosha | "How does horoscope matching work before marriage?" |
| `/personality-matching` | personality matching for marriage | 16 personality types, ENTJ and INFJ compatibility, MBTI-style types | "How to find a compatible partner based on personality?" |
| `/verified-profiles` | verified matrimonial profiles | safe matrimonial website, profile verification, voice introduction | "How do I know a profile is genuine?" |
| `/hindu-matrimony` | Hindu matrimony | Hindu brides, Hindu grooms, Kundli | "Can I search by community?" |
| `/tamil-matrimony` | Tamil matrimony | Tamil brides, Tamil grooms, jathagam, Nakshatra | "Tamil profiles outside India?" |
| `/telugu-matrimony` | Telugu matrimony | Telugu brides, Telugu grooms | "NRI Telugu profiles?" |
| `/south-indian-matrimony` | South Indian matrimony | Kannada, Malayalam, Kerala brides/grooms | "Search across South Indian languages?" |
| `/nri-matrimony` | NRI matrimony | Indian matrimony USA/abroad, NRI brides/grooms | "How can NRI Indians find a marriage partner?" |

Deliberately **not** created: city/state pages (e.g. "Indian matrimony in Texas") and Kannada/Malayalam-only pages — there is no evidence of dedicated operational coverage, and thin location pages would hurt more than help. Add them only with genuinely unique content (local events, local success stories with consent).

## 7. Prerender architecture

- `angular.json` → `"outputMode": "static"`, `"server": "src/main.server.ts"`. `ng build` renders the routes listed as `RenderMode.Prerender` in `src/app/app.routes.server.ts` to `dist/suhana/browser/<route>/index.html`; every other route uses `index.csr.html`.
- No Node server at runtime: nginx serves the files (`try_files $uri $uri/index.html /index.csr.html`).
- Blog articles: `getPrerenderParams` fetches all published articles at build time. Articles published later are served with `blog.csr.html` (indexable shell) until the next build.
- Pages render as a **signed-out guest**. `src/main.server.ts` provides an empty, stateless Web Storage; `prerenderHttpInterceptor` refuses all API calls except `/v1/public/blog/`.
- Hydration is **not** enabled: the browser app re-renders over the static HTML (same content for guests). Header, chatbot and several pages render differently for signed-in members, which would cause hydration mismatches. See §17 for the path to enable it.
- Rules for new code that runs on a prerendered page: no `window`/`document`/`localStorage`/`IntersectionObserver` at construction or in `ngOnInit` without a guard (`isPlatformBrowser`, `typeof X !== 'undefined'`), and handle HTTP errors (an unhandled error fails the build).

## 8. Structured data

| Type | Where | Source |
|---|---|---|
| Organization (+ logo, slogan, `sameAs` = footer social links) | every page | `SeoService` (`data-seo="site"`) |
| WebSite | every page | `SeoService` |
| BreadcrumbList | landing pages, blog | page components |
| Service | 5 feature landing pages | `landing-pages.content.ts` |
| FAQPage | all 10 landing pages (FAQs are visible on the page) | `landing-pages.content.ts` |
| BlogPosting | blog articles | `blog-article.page.ts` |

JSON-LD is only emitted for indexable pages and never describes a member. `<` is escaped inside JSON-LD to prevent script injection from article titles. Note: Google currently shows FAQ rich results only for a limited set of sites; the markup is still valid and helps Bing.

## 9. Sitemaps and robots

- `scripts/seo-postbuild.mjs` (runs after `npm run build` / `build-prod`) reads the prerendered HTML and writes:
  - `sitemap-pages.xml` — every indexable prerendered page (canonical URLs). No `<lastmod>`: build dates are not content changes.
  - `sitemap.xml` — sitemap index → `sitemap-pages.xml` + `sitemap-blog.xml`.
  - `robots.txt` — disallows pure app areas (admin, chat, settings, notifications, payment, auth links); references the sitemap.
- `sitemap-blog.xml` is proxied by nginx to the API (`GET /v1/seo/sitemap-blog.xml`) and always reflects published articles, with `lastmod` = the article's last update.
- `/view/`, `/profile-view/` and `/search` are intentionally **not** disallowed: crawlers must be able to fetch them to see `noindex` (a disallowed URL can still be indexed from external links, e.g. a profile link shared on WhatsApp).

## 10. Privacy and profile indexing strategy

- Member profiles are **never indexable**: no `data.seo` on their routes → `noindex`; served from `index.csr.html`, which carries `noindex` in the first byte; never prerendered; never in a sitemap; no JSON-LD/OG describing a member.
- Member data cannot reach static HTML: prerendering only calls the public blog API; the home page skips its featured-profile fetch while prerendering; the validator fails the build on member photo URLs or profile links in prerendered HTML.
- The home page's featured-profiles section (client-rendered for guests) has `data-nosnippet`.
- Analytics never receives ids: page views for routes with parameters are reported as the route pattern (`/profile-view/:id`).
- robots.txt and `noindex` are not access control: profile/search APIs must keep enforcing authentication and photo-privacy server-side.
- **Product decision for the business:** guests can browse `/search` and `/view/:code` today. They are noindex, but anyone with a link can view them. If that is not intended, gate them in the API.

## 11. Google Search Console (manual)

1. Add a **Domain property** for `auroramatrimony.com` and verify with the DNS TXT record (covers www/non-www and http/https). No code change needed.
2. Submit `https://www.auroramatrimony.com/sitemap.xml`.
3. URL Inspection → test `/`, `/horoscope-matching`, `/tamil-matrimony` → "View crawled page" should show full HTML content.
4. Watch *Pages* (indexing), *Core Web Vitals* and *Performance* weekly for the first months. Expect member URLs under "Excluded by noindex" — that is correct.

## 12. Bing Webmaster Tools (manual)

1. Sign in → *Import from Google Search Console* (fastest), or add the site and verify via DNS CNAME.
2. Submit `https://www.auroramatrimony.com/sitemap.xml`.
3. Use *URL Inspection* and *Site Explorer* to confirm the landing pages are crawled.

## 13. IndexNow

- API: set `SITE_URL=https://www.auroramatrimony.com` and `INDEXNOW_KEY=<8–128 chars a–z, A–Z, 0–9, ->` (e.g. a UUID). When both are set, the API notifies IndexNow whenever a **published** blog article is created, updated (old and new URL if the title changed) or deleted. Nothing else is ever submitted.
- Web: set the **same** `INDEXNOW_KEY` on the web container (Cloud Run env var). nginx serves it at `/<key>.txt` for verification.
- Generate a key: `node -e "console.log(crypto.randomUUID())"`. Store it as a secret, not in the repo.

## 14. Analytics

- GA4 is **off** by default. To enable: set `ga4MeasurementId` in `src/environments/environment.prod.ts`, deploy. A consent banner appears; gtag loads only after "Accept".
- Events: `page_view` (manual, sanitised path), `cta_register_click` (`cta_location`, `page_path`), `registration_start`, `sign_up` (`method`), `generate_lead` (`form`).
- In GA4: mark `sign_up` and `generate_lead` as key events; build an exploration *Landing page × Session source = organic × sign_up* to see which pages produce registrations.
- Update the privacy policy to mention analytics cookies before enabling.

## 15. Production deployment requirements

| Where | Setting | Value |
|---|---|---|
| Web container (Cloud Run `suhana-app`) | `CANONICAL_HOST` | `www.auroramatrimony.com` (default in Dockerfile) |
| | `APEX_HOST` | `auroramatrimony.com` |
| | `API_ORIGIN` | `https://api.auroramatrimony.com` |
| | `INDEXNOW_KEY` | same as API (optional) |
| API | `SITE_URL` | `https://www.auroramatrimony.com` (required for the blog sitemap) |
| | `INDEXNOW_KEY` | optional |
| DNS / Cloud Run | domain mappings | map **both** `auroramatrimony.com` and `www.auroramatrimony.com` to the web service so the apex request reaches nginx and gets the 301 |

- Build: Cloud Build runs the default `Dockerfile` → `npm run build -- --configuration production` → `postbuild` validation. **A failing SEO/privacy check fails the deploy on purpose.**
- The build calls the production API only for `/v1/public/blog/` (to prerender articles); if it is unreachable the build still succeeds and articles render client-side.
- Rebuild/redeploy after publishing articles to get them prerendered (they are indexable and in the sitemap immediately either way).
- `netlify.toml` and `web.config` are not used by the Cloud Run deployment and still describe the old SPA fallback; update them (fallback → `/index.csr.html`) if those hosts are ever used.

## 16. Testing and validation results

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ |
| `npm run build-prod` (production, prerender) | ✅ 22 routes prerendered |
| `scripts/seo-postbuild.mjs` | ✅ 21 indexable + 1 noindex (empty blog); unique titles; descriptions 50–170 chars; one canonical each; valid JSON-LD; absolute HTTPS `og:image`; no member data |
| Initial bundle | 1.62 MB raw (was 1.60 MB before; the 1 MB budget warning pre-dates this work) |
| HTTP checks (local static server emulating nginx `try_files`) | public pages: `index, follow` + canonical in the first response; `/search`, `/view/*`, `/profile-view/*`, unknown URLs: `noindex` in the first response; new blog articles: indexable shell; `/about/` → 301 `/about` |
| Browser (navigation between pages) | title/description/robots/canonical/OG/JSON-LD replaced on every navigation, no duplicates; canonical + page JSON-LD removed on noindex pages; no console errors; landing pages responsive at 375 px |
| API | `/v1/public/blog/posts` 200; invalid id 400; unknown id 404; `/v1/seo/sitemap-blog.xml` 200 (503 until `SITE_URL` is set) |
| Unit tests | The repo has no unit-test runner configured (`ng test` has no target), so no spec files were added; `seo-postbuild.mjs` is the automated regression test and runs on every build. |

**Manual validation after deployment:** Rich Results Test (https://search.google.com/test/rich-results) and Schema Markup Validator (https://validator.schema.org/) on a landing page and an article; PageSpeed Insights (https://pagespeed.web.dev/) on `/` and two landing pages (mobile).

## 17. Recommendations / next steps

**Needs a business decision (content accuracy)**
- Home page shows hard-coded stats — *"2M+ Verified Profiles", "50K+ Successful Matches", "92% Avg. Compatibility", "4.8 User Rating"*. Prerendering now puts them in indexed HTML. Replace them with real figures (e.g. from the success-stats API) or remove them.
- Home feature cards say *"Every profile undergoes thorough verification"* and *"Upload 30–60 second videos"* (recorded video introductions are not implemented); the About FAQ says *"messages are end-to-end encrypted"*. Correct or remove these claims.
- Confirm the audience pages (Hindu, Tamil, Telugu, South Indian, NRI) match who Aurora actively serves; remove an entry from `landing-pages.registry.ts` (and its content block) to unpublish it everywhere.
- **Blog moderation:** any signed-in member can create a post via the API and it is published immediately (no role check, `published: true`). With a public, indexed blog this invites spam. Restrict post creation to admins and/or default new posts to unpublished before writing articles. Also: the blog search uses `ILIKE` (PostgreSQL-only; fails on MySQL).

**SEO growth**
1. Write the first articles from `docs/seo/blog-content-plan.md` (human-reviewed); link each to the matching landing page and register CTA.
2. Give the home page H1 a more descriptive title (e.g. "Indian Matrimony — Find Your Perfect Life Partner"); it currently uses the first banner title "Find Your Perfect Match".
3. Add genuine, consented success stories to landing pages once available (strong trust signal).
4. Enable hydration later: add `provideClientHydration(withEventReplay())` and mark auth-dependent components (`app-header`, `app-ai-chatbot`, signed-in sections) with `ngSkipHydration`; this removes the re-render flash on prerendered pages.
5. Performance: lazy-load the chatbot and calling code, trim Material modules from the initial bundle (1.62 MB raw), and preload the home hero image.
6. Consider true SSR (Node server) only if public pages need request-time data; static prerender covers the current public content.
7. Measure success by organic **registrations** (GA4 `sign_up` by landing page), not by indexed-page counts.
