#!/usr/bin/env node
/**
 * Static HTML prerenderer (no headless browser).
 *
 * Strategy:
 *   - Read dist/index.html produced by `vite build`.
 *   - For every known public route, produce a copy with per-route <title>,
 *     description, OG/Twitter tags, canonical, hreflang, <html lang>, and
 *     optional JSON-LD injected at the server/CDN level.
 *   - Write to dist/<lang>/<path> so that S3 keys match the browser URL and
 *     CloudFront serves the prerendered markup directly to crawlers. The same
 *     React SPA still hydrates on top.
 *
 * We deliberately avoid puppeteer / headless Chrome to keep build times fast
 * and dependencies small. Dynamic pages (specialties / procedures) are built
 * from the public API; provider detail pages are left to client render.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const STAGING = resolve(DIST, '__prerendered');
const MANIFEST = resolve(STAGING, 'manifest.json');
const TEMPLATE_PATH = resolve(DIST, 'index.html');

const SITE = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://doktochain.ca').replace(
  /\/$/,
  ''
);
const API = (process.env.VITE_API_URL || process.env.API_URL || 'https://api.doktochain.ca').replace(
  /\/$/,
  ''
);
const OG_IMAGE = `${SITE}/image/og-cover-1200x630.png`;
const DISABLE_DYNAMIC = process.env.PRERENDER_STATIC_ONLY === '1';

const DEFAULT_DESCRIPTION =
  'Book appointments, access medical records, and connect with healthcare providers across Canada. Secure, compliant care.';

// -- i18n copy -----------------------------------------------------------

const STATIC_ROUTES = [
  {
    path: '/pricing',
    en: {
      title: 'Pricing & plans | DoktoChain',
      description:
        'Transparent pricing for patients and providers. Founding member offers and subscription options for Canadian healthcare.',
    },
    fr: {
      title: 'Tarifs et forfaits | DoktoChain',
      description:
        'Tarification transparente pour patients et professionnels. Offres membres fondateurs et abonnements pour la santé canadienne.',
    },
  },
  {
    path: '/for-business',
    en: {
      title: 'For clinics & pharmacies | DoktoChain',
      description:
        'Bring your practice or pharmacy onto DoktoChain: scheduling, telehealth, prescriptions, and compliance.',
    },
    fr: {
      title: 'Pour cliniques et pharmacies | DoktoChain',
      description:
        'Amenez votre cabinet ou pharmacie sur DoktoChain : planification, télésanté, ordonnances et conformité.',
    },
  },
  {
    path: '/frontend/find-providers',
    en: {
      title: 'Find healthcare providers | DoktoChain',
      description:
        'Search and book trusted doctors and specialists across Canada on DoktoChain.',
    },
    fr: {
      title: 'Trouver un professionnel de santé | DoktoChain',
      description:
        'Recherchez et réservez des médecins et spécialistes de confiance à travers le Canada sur DoktoChain.',
    },
  },
  {
    path: '/frontend/about',
    en: {
      title: 'About DoktoChain',
      description:
        'Learn how DoktoChain connects patients, providers, and pharmacies with privacy-first Canadian healthcare technology.',
    },
    fr: {
      title: 'À propos de DoktoChain',
      description:
        'Découvrez comment DoktoChain relie patients, professionnels et pharmacies avec une technologie de santé canadienne axée sur la confidentialité.',
    },
  },
  {
    path: '/frontend/help',
    en: {
      title: 'Help center | DoktoChain',
      description: 'Get help using DoktoChain: appointments, records, billing, and support.',
    },
    fr: {
      title: "Centre d'aide | DoktoChain",
      description:
        'Obtenez de l’aide pour utiliser DoktoChain : rendez-vous, dossiers, facturation et support.',
    },
  },
  {
    path: '/frontend/browse/specialties',
    en: {
      title: 'Medical specialties | DoktoChain',
      description: 'Browse medical specialties and find the right care on DoktoChain.',
    },
    fr: {
      title: 'Spécialités médicales | DoktoChain',
      description:
        'Parcourez les spécialités médicales et trouvez les soins qui vous conviennent sur DoktoChain.',
    },
  },
  {
    path: '/frontend/browse/procedures',
    en: {
      title: 'Medical procedures | DoktoChain',
      description: 'Explore procedures and services available through DoktoChain providers.',
    },
    fr: {
      title: 'Procédures médicales | DoktoChain',
      description:
        'Explorez les procédures et services offerts par les professionnels DoktoChain.',
    },
  },
  {
    path: '/legal/privacy-policy',
    en: {
      title: 'Privacy policy | DoktoChain',
      description: 'How DoktoChain collects, uses, and protects your personal information.',
    },
    fr: {
      title: 'Politique de confidentialité | DoktoChain',
      description:
        'Comment DoktoChain collecte, utilise et protège vos renseignements personnels.',
    },
  },
  {
    path: '/legal/terms-of-service',
    en: {
      title: 'Terms of service | DoktoChain',
      description: 'Terms governing use of the DoktoChain platform and services.',
    },
    fr: {
      title: 'Conditions d’utilisation | DoktoChain',
      description:
        'Conditions régissant l’utilisation de la plateforme et des services DoktoChain.',
    },
  },
  {
    path: '/legal/cookie-policy',
    en: {
      title: 'Cookie policy | DoktoChain',
      description: 'How DoktoChain uses cookies and similar technologies.',
    },
    fr: {
      title: 'Politique relative aux témoins | DoktoChain',
      description:
        'Comment DoktoChain utilise les témoins et technologies similaires.',
    },
  },
  {
    path: '/legal/accessibility',
    en: {
      title: 'Accessibility | DoktoChain',
      description: 'Accessibility commitment and options for using DoktoChain.',
    },
    fr: {
      title: 'Accessibilité | DoktoChain',
      description: 'Engagement d’accessibilité et options pour utiliser DoktoChain.',
    },
  },
  {
    path: '/legal/refund-policy',
    en: {
      title: 'Refund policy | DoktoChain',
      description: 'Refund and cancellation policy for DoktoChain services.',
    },
    fr: {
      title: 'Politique de remboursement | DoktoChain',
      description: 'Politique de remboursement et d’annulation pour les services DoktoChain.',
    },
  },
];

// -- HTML composition ----------------------------------------------------

function clip(s, n = 300) {
  if (!s) return '';
  return String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s);
}

function htmlEscapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHead(route, template) {
  const { lang, path, title, description, canonical, jsonLd } = route;
  const t = htmlEscapeAttr(title);
  const d = htmlEscapeAttr(clip(description));
  const canonEsc = htmlEscapeAttr(canonical);
  const enAlt = htmlEscapeAttr(`${SITE}/en${path}`);
  const frAlt = htmlEscapeAttr(`${SITE}/fr${path}`);
  const locale = lang === 'fr' ? 'fr_CA' : 'en_CA';
  const altLocale = lang === 'fr' ? 'en_CA' : 'fr_CA';

  let html = template;

  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}-CA"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);

  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${d}">`
  );

  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonEsc}">`
  );

  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="en-CA"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="en-CA" href="${enAlt}">`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="fr-CA"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="fr-CA" href="${frAlt}">`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="x-default" href="${enAlt}">`
  );

  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${t}">`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${d}">`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonEsc}">`
  );
  html = html.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="${locale}">`
  );
  html = html.replace(
    /<meta\s+property="og:locale:alternate"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale:alternate" content="${altLocale}">`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${t}">`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${d}">`
  );

  if (jsonLd) {
    const script = `<script id="doktochain-jsonld" type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    html = html.replace('</head>', `${script}\n</head>`);
  }

  return html;
}

// -- Route collection ----------------------------------------------------

async function fetchJson(url, timeout = 10000) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.json();
  } finally {
    clearTimeout(to);
  }
}

async function buildDynamicRoutes() {
  if (DISABLE_DYNAMIC) return [];
  const out = [];

  try {
    const specs = await fetchJson(`${API}/public/specialties`);
    for (const s of specs || []) {
      if (!s?.slug) continue;
      const path = `/frontend/browse/specialties/${s.slug}`;
      const specialtyJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MedicalSpecialty',
        name: s.name,
        description: s.description || s.long_description || undefined,
        url: `${SITE}/en${path}`,
      };
      out.push({
        path,
        en: {
          title: `${s.name} specialists in Canada | DoktoChain`,
          description: clip(
            s.description ||
              `Find trusted ${s.name} providers across Canada. Compare availability, reviews, and book an appointment on DoktoChain.`
          ),
          jsonLd: specialtyJsonLd,
        },
        fr: {
          title: `Spécialistes en ${s.name} au Canada | DoktoChain`,
          description: clip(
            `Trouvez des professionnels en ${s.name} à travers le Canada. Comparez disponibilités, avis et prenez rendez-vous sur DoktoChain.`
          ),
          jsonLd: { ...specialtyJsonLd, inLanguage: 'fr-CA', url: `${SITE}/fr${path}` },
        },
      });
    }
    console.log(`[prerender] specialties: ${specs?.length || 0}`);
  } catch (err) {
    console.warn(`[prerender] specialties fetch failed: ${err?.message || err}`);
  }

  try {
    const procs = await fetchJson(`${API}/public/procedures?all=true`);
    for (const p of procs || []) {
      if (!p?.slug || p?.is_active === false) continue;
      const path = `/frontend/browse/procedures/${p.slug}`;
      const procJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MedicalProcedure',
        name: p.name,
        description: p.long_description || p.description || undefined,
        code: p.cpt_code
          ? { '@type': 'MedicalCode', codeValue: p.cpt_code, codingSystem: 'CPT' }
          : undefined,
        url: `${SITE}/en${path}`,
      };
      out.push({
        path,
        en: {
          title: `${p.name} procedure | DoktoChain`,
          description: clip(
            p.description ||
              `Learn about ${p.name}, find qualified providers, and compare typical costs on DoktoChain.`
          ),
          jsonLd: procJsonLd,
        },
        fr: {
          title: `Procédure : ${p.name} | DoktoChain`,
          description: clip(
            `Apprenez-en plus sur ${p.name}, trouvez des professionnels qualifiés et comparez les coûts typiques sur DoktoChain.`
          ),
          jsonLd: { ...procJsonLd, inLanguage: 'fr-CA', url: `${SITE}/fr${path}` },
        },
      });
    }
    console.log(`[prerender] procedures: ${procs?.length || 0}`);
  } catch (err) {
    console.warn(`[prerender] procedures fetch failed: ${err?.message || err}`);
  }

  return out;
}

// -- Writing -------------------------------------------------------------

/**
 * Stage each prerendered page as a .html file inside dist/__prerendered/ so
 * that parent listings and child slugs never collide on the local filesystem.
 * The manifest maps each staged file to its intended S3 key (no extension).
 */
function stageOutput(lang, path, html, manifest) {
  const normalized = path === '/' ? '/' : path;
  const s3Key = `${lang}${normalized}`;
  const relFile = `${lang}${normalized === '/' ? '/index' : normalized}.html`;
  const target = resolve(STAGING, relFile);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, 'utf8');
  manifest.push({ file: relFile, s3Key: normalized === '/' ? `${lang}/` : s3Key });
}

async function main() {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[prerender] template not found: ${TEMPLATE_PATH}`);
    console.error('[prerender] run `vite build` first');
    process.exit(1);
  }

  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  const dynamic = await buildDynamicRoutes();
  const routes = [...STATIC_ROUTES, ...dynamic];

  mkdirSync(STAGING, { recursive: true });

  const manifest = [];
  for (const route of routes) {
    for (const lang of ['en', 'fr']) {
      const copy = route[lang] || route.en;
      const canonical = `${SITE}/${lang}${route.path === '/' ? '/' : route.path}`;
      const html = buildHead(
        {
          lang,
          path: route.path,
          title: copy.title || 'DoktoChain',
          description: copy.description || DEFAULT_DESCRIPTION,
          canonical,
          jsonLd: copy.jsonLd,
        },
        template
      );
      stageOutput(lang, route.path, html, manifest);
    }
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    `[prerender] staged ${manifest.length} pages (${STATIC_ROUTES.length * 2} static + ${dynamic.length * 2} dynamic) → ${STAGING}`
  );
  console.log(`[prerender] default OG image: ${OG_IMAGE}`);
  console.log(`[prerender] manifest: ${MANIFEST}`);
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
