#!/usr/bin/env node
/**
 * SEO post-build step (runs automatically after `npm run build` / `npm run build-prod`).
 *
 * 1. Validates every prerendered page in dist/: title, description, robots, canonical,
 *    Open Graph image, JSON-LD syntax, and that no member data leaked into static HTML.
 * 2. Writes sitemap-pages.xml (indexable prerendered pages), sitemap.xml (index that also points
 *    to the API-generated blog sitemap) and robots.txt.
 * 3. Marks the client-only fallback shell (index.csr.html — profiles, search, account pages…)
 *    noindex in the *initial* HTML, and writes blog.csr.html (indexable shell) for blog articles
 *    published after the last build.
 *
 * Exits with code 1 on any error, so a broken page never ships. No dependencies.
 * Usage: node scripts/seo-postbuild.mjs [distBrowserDir]   (SITE_URL env overrides the origin)
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.argv[2] ?? 'dist/suhana/browser');
const errors = [];
const warnings = [];

if (!fs.existsSync(path.join(DIST, 'index.csr.html'))) {
  console.error(`[seo] ${DIST}/index.csr.html not found — run the Angular build first (outputMode "static").`);
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1];
const tags = (html, tagName) => html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? [];
const metaContent = (html, key, keyAttr = 'name') =>
  tags(html, 'meta').filter(t => attr(t, keyAttr)?.toLowerCase() === key).map(t => attr(t, 'content') ?? '');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const xmlEscape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === 'index.html') out.push(p);
  }
  return out;
}

// ── read every prerendered page ──────────────────────────────────────────────
const pages = walk(DIST).map(file => {
  const rel = path.relative(DIST, path.dirname(file)).split(path.sep).join('/');
  const route = rel ? `/${rel}` : '/';
  const html = fs.readFileSync(file, 'utf8');
  const robots = (metaContent(html, 'robots')[0] ?? '').toLowerCase();
  return {
    file, route, html,
    title: decode(html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? ''),
    description: decode(metaContent(html, 'description')[0] ?? ''),
    robots,
    indexable: robots.includes('index') && !robots.includes('noindex'),
    canonicals: tags(html, 'link').filter(t => attr(t, 'rel')?.toLowerCase() === 'canonical').map(t => attr(t, 'href') ?? ''),
    ogImage: metaContent(html, 'og:image', 'property')[0] ?? '',
    modified: metaContent(html, 'article:modified_time', 'property')[0] ?? '',
    jsonLd: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]),
    h1Count: (html.match(/<h1\b/gi) ?? []).length,
  };
});

// Origin: SITE_URL env, else the canonical of the prerendered home page.
const home = pages.find(p => p.route === '/');
const SITE = (process.env.SITE_URL || home?.canonicals[0] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(SITE)) {
  console.error('[seo] Could not determine the site origin (set SITE_URL or prerender "/" with a canonical).');
  process.exit(1);
}

// ── validate ─────────────────────────────────────────────────────────────────
const PRIVATE_LEAKS = [
  { rx: /inv-images\/matrimony\/(profile|gallery)\//i, what: 'member photo URL' },
  { rx: /href="\/(profile-view|view|profile-match|horoscope-match|gallery)\/[^"]+"/i, what: 'link to a member profile' },
  { rx: /Skipped while prerendering/i, what: 'prerender error text rendered into the page' },
];

const seenTitles = new Map();
for (const p of pages) {
  const where = `${p.route} (${path.relative(process.cwd(), p.file)})`;
  if (!p.title) errors.push(`${where}: missing <title>`);
  if (!p.robots) errors.push(`${where}: missing <meta name="robots">`);
  for (const { rx, what } of PRIVATE_LEAKS) if (rx.test(p.html)) errors.push(`${where}: contains ${what}`);
  p.jsonLd.forEach((block, i) => { try { JSON.parse(block); } catch (e) { errors.push(`${where}: JSON-LD block ${i + 1} is invalid (${e.message})`); } });

  if (p.indexable) {
    const expected = p.route === '/' ? `${SITE}/` : `${SITE}${p.route}`;
    if (p.canonicals.length !== 1) errors.push(`${where}: expected exactly 1 canonical, found ${p.canonicals.length}`);
    else if (p.canonicals[0] !== expected) errors.push(`${where}: canonical ${p.canonicals[0]} ≠ ${expected}`);
    if (p.description.length < 50 || p.description.length > 170) errors.push(`${where}: description is ${p.description.length} chars (want 50–170)`);
    if (!/^https?:\/\//.test(p.ogImage)) errors.push(`${where}: og:image must be an absolute URL (got "${p.ogImage}")`);
    if (SITE.startsWith('https://') && !p.ogImage.startsWith('https://')) errors.push(`${where}: og:image must be HTTPS`);
    if (seenTitles.has(p.title)) errors.push(`${where}: duplicate title (also on ${seenTitles.get(p.title)})`);
    seenTitles.set(p.title, p.route);
    if (p.h1Count !== 1) warnings.push(`${where}: ${p.h1Count} <h1> elements (1 is recommended)`);
    if (p.title.length > 70) warnings.push(`${where}: title is ${p.title.length} chars (may be truncated in results)`);
  } else if (p.canonicals.length) {
    errors.push(`${where}: noindex page should not declare a canonical URL`);
  }
}

// ── client-only shells ───────────────────────────────────────────────────────
const csrPath = path.join(DIST, 'index.csr.html');
let csr = fs.readFileSync(csrPath, 'utf8');
csr = csr.replace(/<meta name="robots"[^>]*>\s*/gi, '');
// Indexable shell for /matrimony-blog/* articles published after this build (nginx uses it).
fs.writeFileSync(path.join(DIST, 'blog.csr.html'), csr);
// Everything else that is not prerendered (profiles, search, account, admin…): noindex from byte one.
fs.writeFileSync(csrPath, csr.replace(/<head>/i, '<head>\n    <meta name="robots" content="noindex, follow" />'));

// ── sitemaps + robots.txt ────────────────────────────────────────────────────
const isArticle = r => /^\/matrimony-blog\/.+/.test(r); // covered by the live blog sitemap from the API
const sitemapPages = pages
  .filter(p => p.indexable && !isArticle(p.route))
  .map(p => p.canonicals[0])
  .sort((a, b) => (a === `${SITE}/` ? -1 : b === `${SITE}/` ? 1 : a.localeCompare(b)));

// No <lastmod> for static pages: the build date is not a content change, and an inaccurate lastmod is
// worse than none. Blog articles get real lastmod values from the API sitemap.
fs.writeFileSync(path.join(DIST, 'sitemap-pages.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemapPages.map(u => `  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n') + `\n</urlset>\n`);

fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>\n` +
  `  <sitemap><loc>${SITE}/sitemap-blog.xml</loc></sitemap>\n` +
  `</sitemapindex>\n`);

// robots.txt only keeps crawlers out of pure app areas. Member pages (/view/, /profile-view/, /search)
// are deliberately NOT disallowed: crawlers must be able to fetch them to see their noindex, otherwise
// shared links could still be indexed as bare URLs. Privacy itself is enforced by authentication.
fs.writeFileSync(path.join(DIST, 'robots.txt'), [
  '# Aurora Matrimony',
  'User-agent: *',
  'Disallow: /admin',
  'Disallow: /match-fixed/admin',
  'Disallow: /testimonials/admin',
  'Disallow: /chat',
  'Disallow: /settings',
  'Disallow: /notifications',
  'Disallow: /profile/edit',
  'Disallow: /premium/payment',
  'Disallow: /auth/',
  'Disallow: /accept/',
  'Disallow: /registration-success/',
  'Allow: /',
  '',
  `Sitemap: ${SITE}/sitemap.xml`,
  '',
].join('\n'));

// ── report ───────────────────────────────────────────────────────────────────
const indexable = pages.filter(p => p.indexable);
console.log(`[seo] origin ${SITE}`);
console.log(`[seo] ${pages.length} prerendered pages — ${indexable.length} indexable, ${pages.length - indexable.length} noindex`);
console.log(`[seo] sitemap-pages.xml: ${sitemapPages.length} URLs · sitemap.xml · robots.txt · blog.csr.html written`);
for (const w of warnings) console.warn(`[seo] warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[seo] ERROR: ${e}`);
  console.error(`[seo] ${errors.length} error(s) — failing the build.`);
  process.exit(1);
}
console.log('[seo] all checks passed');
