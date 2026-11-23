# Aurora Matrimony — Blog Content Plan (first 12 articles)

Editorial briefs, **not** finished articles. Each article must be written (or AI-drafted and then
substantially edited) by a person, fact-checked against the product, and reviewed before publishing.
Publishing happens through the API (`POST /v1/blog/posts`); the article then appears on
`/matrimony-blog/:id/:slug`, in `sitemap-blog.xml`, and is announced via IndexNow.

**Rules for every article**
- One search intent; answer it in the first 2–3 sentences, then go deeper.
- 900–1,600 words of original, useful content; no keyword lists, no filler, no invented statistics.
- Title ≤ 60 characters (it becomes `<title>` + "| Aurora Matrimony"); excerpt 140–160 characters (meta description).
- Use H2/H3 headings in `content_html`; no inline styles (they are stripped).
- 2–4 contextual internal links with descriptive anchor text (targets listed below) and the register CTA (added automatically).
- Only describe Aurora features that exist; plan-dependent features say so.
- Category: use `guide` or `tips` (other existing categories — vote/party/suhana/news — are not matrimony topics).

| # | Working title | Primary intent / keyword | Outline (H2s) | Internal links |
|---|---|---|---|---|
| 1 | How to Find the Right Life Partner Today | find the right life partner | Know your non-negotiables · Values vs. preferences · Involving family without losing your voice · Using matrimonial sites well · Red flags · When to meet | `/how-it-works`, `/ai-matchmaking`, `/safety-tips` |
| 2 | 10 Things to Consider Before Choosing a Life Partner | choosing a life partner | Values & faith · Family expectations · Career & location · Finances · Children · Communication style · Health & lifestyle · Conflict handling · Shared goals · Gut feeling | `/personality-matching`, `/horoscope-matching` |
| 3 | How AI Matchmaking Helps You Find a Compatible Partner | AI matchmaking for marriage | What AI matchmaking is (and isn't) · Natural-language search · How compatibility scores are built · Where human judgement matters · Privacy | `/ai-matchmaking`, `/verified-profiles` |
| 4 | Why Horoscope Matching Matters in Indian Marriages | horoscope matching importance | Tradition and meaning · What families check · Ashtakoota in brief · Doshas and remedies (balanced view) · Using a report alongside an astrologer | `/horoscope-matching`, `/hindu-matrimony` |
| 5 | Understanding Rasi and Nakshatra Compatibility | rasi nakshatra matching | Rasi vs. Nakshatra · How they enter Guna Milan · Porutham (South Indian practice) · Common questions · Limits of any score | `/horoscope-matching`, `/tamil-matrimony` |
| 6 | What Is 16 Personality Matching in Marriage? | personality matching for marriage | The four dimensions · What a type does/doesn't say · Compatibility patterns · Talking about differences · Taking Aurora's assessment | `/personality-matching`, `/ai-matchmaking` |
| 7 | ENTJ and INFJ Compatibility in Marriage | ENTJ INFJ compatibility | Strengths of each type · Where they align · Likely friction · Communication tips · Real-life scenarios | `/personality-matching` |
| 8 | How to Write an Attractive Matrimonial Profile | matrimonial profile tips | Photos (privacy settings) · About-me that sounds like you · Partner expectations · Family section · Voice introduction · Mistakes to avoid | `/verified-profiles`, `/register` |
| 9 | Tips for Parents Searching for a Bride or Groom | parents searching for bride/groom | Agreeing on criteria with your child · Shortlisting together · First conversations · Respecting consent · Safety | `/how-it-works`, `/safety-tips` |
| 10 | How NRI Indians Can Find a Compatible Life Partner | NRI matrimony | Relocation conversations · Time zones & calls · Cultural fit across countries · Family in India · Verification | `/nri-matrimony`, `/verified-profiles` |
| 11 | Why Voice and Video Introductions Matter Before Marriage | voice introduction matrimony | Beyond photos and text · First impressions · Building trust · Safety · How to record a good voice intro | `/verified-profiles`, `/how-it-works` |
| 12 | What Makes a Matrimonial Profile Trustworthy? | trustworthy matrimonial profile | Verification signals · Consistency · Communication patterns · Warning signs · Reporting | `/verified-profiles`, `/safety-tips` |

**Note on #11:** Aurora has voice introductions and in-app audio/video calls; recorded *video* introductions are not live yet — do not imply they are.

**Suggested cadence:** 2 articles per month, starting with #3, #4, #6 and #10 (closest to Aurora's differentiators and landing pages).
