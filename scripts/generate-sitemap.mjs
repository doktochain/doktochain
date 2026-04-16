#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 *
 * - Emits localized entries for every public route (en-CA, fr-CA, x-default).
 * - Writes public/sitemap.xml so it is copied into the built output.
 * - Dynamic routes (specialties, procedures, providers) are fetched from the
 *   public API when API_URL / VITE_API_URL is set. On network failure the
 *   script logs a warning and still produces a valid static sitemap.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'public', 'sitemap.xml');

const SITE = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://doktochain.ca').replace(
  /\/$/,
  ''
);
const API = (process.env.VITE_API_URL || process.env.API_URL || 'https://api.doktochain.ca').replace(
  /\/$/,
  ''
);
const DISABLE_DYNAMIC = process.env.SITEMAP_STATIC_ONLY === '1';
const FETCH_TIMEOUT_MS = Number(process.env.SITEMAP_FETCH_TIMEOUT_MS || 10000);
const PROVIDER_LIMIT = Number(process.env.SITEMAP_PROVIDER_LIMIT || 1000);

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { path: '/for-business', priority: '0.8', changefreq: 'monthly' },
  { path: '/frontend/find-providers', priority: '0.9', changefreq: 'weekly' },
  { path: '/frontend/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/frontend/help', priority: '0.7', changefreq: 'monthly' },
  { path: '/frontend/browse/specialties', priority: '0.8', changefreq: 'weekly' },
  { path: '/frontend/browse/procedures', priority: '0.8', changefreq: 'weekly' },
  { path: '/legal/privacy-policy', priority: '0.4', changefreq: 'yearly' },
  { path: '/legal/terms-of-service', priority: '0.4', changefreq: 'yearly' },
  { path: '/legal/cookie-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/legal/accessibility', priority: '0.3', changefreq: 'yearly' },
  { path: '/legal/refund-policy', priority: '0.3', changefreq: 'yearly' },
];

async function fetchJson(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.json();
  } finally {
    clearTimeout(to);
  }
}

async function loadDynamicRoutes() {
  if (DISABLE_DYNAMIC) {
    console.log('[sitemap] dynamic routes disabled via SITEMAP_STATIC_ONLY=1');
    return [];
  }

  const dynamic = [];

  try {
    const specs = await fetchJson(`${API}/public/specialties`);
    const rows = Array.isArray(specs) ? specs : [];
    for (const s of rows) {
      if (!s?.slug) continue;
      dynamic.push({
        path: `/frontend/browse/specialties/${s.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
      });
    }
    console.log(`[sitemap] loaded ${rows.length} specialties`);
  } catch (err) {
    console.warn(`[sitemap] specialties fetch failed: ${err?.message || err}`);
  }

  try {
    const procs = await fetchJson(`${API}/public/procedures?all=true`);
    const rows = Array.isArray(procs) ? procs : [];
    for (const p of rows) {
      if (!p?.slug || p?.is_active === false) continue;
      dynamic.push({
        path: `/frontend/browse/procedures/${p.slug}`,
        priority: '0.6',
        changefreq: 'monthly',
      });
    }
    console.log(`[sitemap] loaded ${rows.length} procedures`);
  } catch (err) {
    console.warn(`[sitemap] procedures fetch failed: ${err?.message || err}`);
  }

  try {
    const provs = await fetchJson(`${API}/public/providers?limit=${PROVIDER_LIMIT}`);
    const rows = Array.isArray(provs) ? provs : [];
    for (const p of rows) {
      if (!p?.id) continue;
      dynamic.push({
        path: `/frontend/provider-profile/${p.id}`,
        priority: '0.5',
        changefreq: 'weekly',
        lastmod: p?.updated_at || p?.created_at,
      });
    }
    console.log(`[sitemap] loaded ${rows.length} providers`);
  } catch (err) {
    console.warn(`[sitemap] providers fetch failed: ${err?.message || err}`);
  }

  return dynamic;
}

function localizedLoc(path, lang) {
  const normalized = path === '/' ? '/' : path;
  return `${SITE}/${lang}${normalized === '/' ? '/' : normalized}`;
}

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function normalizeLastmod(raw) {
  if (!raw) return undefined;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

function renderUrlEntry({ path, priority, changefreq, lastmod }) {
  const enLoc = localizedLoc(path, 'en');
  const frLoc = localizedLoc(path, 'fr');
  const altEn = `<xhtml:link rel="alternate" hreflang="en-CA" href="${xmlEscape(enLoc)}"/>`;
  const altFr = `<xhtml:link rel="alternate" hreflang="fr-CA" href="${xmlEscape(frLoc)}"/>`;
  const altX = `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(enLoc)}"/>`;
  const lm = normalizeLastmod(lastmod);
  const lastmodTag = lm ? `<lastmod>${lm}</lastmod>` : '';
  return [
    `  <url><loc>${xmlEscape(enLoc)}</loc>${lastmodTag}<changefreq>${changefreq}</changefreq><priority>${priority}</priority>${altEn}${altFr}${altX}</url>`,
    `  <url><loc>${xmlEscape(frLoc)}</loc>${lastmodTag}<changefreq>${changefreq}</changefreq><priority>${priority}</priority>${altEn}${altFr}${altX}</url>`,
  ].join('\n');
}

async function main() {
  const dynamic = await loadDynamicRoutes();
  const routes = [...STATIC_ROUTES, ...dynamic];

  const body = routes.map(renderUrlEntry).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, xml, 'utf8');
  console.log(
    `[sitemap] wrote ${routes.length * 2} URL entries (${STATIC_ROUTES.length * 2} static + ${dynamic.length * 2} dynamic) → ${OUT}`
  );
}

main().catch((err) => {
  console.error('[sitemap] generation failed:', err);
  process.exit(1);
});
