#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 *
 * - Emits localized entries for every public route (en-CA, fr-CA, x-default).
 * - Writes public/sitemap.xml so it is copied into the built output.
 * - Can be extended with dynamic routes (providers, specialties, procedures,
 *   blog posts) by wiring a data fetch here.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'public', 'sitemap.xml');

const SITE = (process.env.VITE_SITE_URL || 'https://doktochain.ca').replace(/\/$/, '');

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

/**
 * Hook for dynamic routes. Return an array of
 *   { path: '/frontend/provider-profile/<id>', priority, changefreq, lastmod? }
 * entries. Left empty by default so the build doesn't require DB credentials.
 */
async function loadDynamicRoutes() {
  return [];
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

function renderUrlEntry({ path, priority, changefreq, lastmod }) {
  const enLoc = localizedLoc(path, 'en');
  const frLoc = localizedLoc(path, 'fr');
  const altEn = `<xhtml:link rel="alternate" hreflang="en-CA" href="${xmlEscape(enLoc)}"/>`;
  const altFr = `<xhtml:link rel="alternate" hreflang="fr-CA" href="${xmlEscape(frLoc)}"/>`;
  const altX = `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(enLoc)}"/>`;
  const lastmodTag = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : '';
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
  const total = routes.length * 2;
  console.log(`[sitemap] wrote ${total} URL entries → ${OUT}`);
}

main().catch((err) => {
  console.error('[sitemap] generation failed:', err);
  process.exit(1);
});
