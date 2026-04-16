const FALLBACK_ORIGIN = 'https://doktochain.ca';

const OG_IMAGE_PATH = '/image/og-cover-1200x630.png';

export function getSiteOrigin(): string {
  const env = import.meta.env.VITE_SITE_URL as string | undefined;
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}

export function getDefaultOgImage(): string {
  return absoluteUrl(OG_IMAGE_PATH);
}

export type SeoEntry = {
  title: string;
  description: string;
  robots: 'index,follow' | 'noindex,nofollow';
  image?: string;
  jsonLd?: Record<string, unknown>;
};

const DEFAULT_SEO: SeoEntry = {
  title: "DoktoChain — Canada's healthcare platform",
  description:
    'Book appointments, access medical records, and connect with healthcare providers across Canada. Secure, compliant care.',
  robots: 'index,follow',
};

function buildMedicalOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        url: absoluteUrl('/'),
        name: 'DoktoChain',
        description: DEFAULT_SEO.description,
        inLanguage: ['en-CA', 'fr-CA'],
        publisher: { '@id': absoluteUrl('/#organization') },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${absoluteUrl('/en/frontend/find-providers')}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'MedicalOrganization',
        '@id': absoluteUrl('/#organization'),
        name: 'DoktoChain',
        url: absoluteUrl('/'),
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/image/doktochain_logo.png'),
        },
        image: absoluteUrl(OG_IMAGE_PATH),
        description: DEFAULT_SEO.description,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'CA',
        },
        areaServed: { '@type': 'Country', name: 'Canada' },
        sameAs: [],
      },
    ],
  };
}

function stripLangPrefix(pathname: string): string {
  const m = pathname.match(/^\/(en|fr)(\/.*)?$/);
  if (!m) return pathname || '/';
  return m[2] || '/';
}

export function resolveSeo(pathname: string): SeoEntry {
  const path = stripLangPrefix(pathname) || '/';

  if (path.startsWith('/dashboard')) {
    return {
      title: 'Dashboard | DoktoChain',
      description:
        'Your DoktoChain account: appointments, records, and care tools. Sign in required.',
      robots: 'noindex,nofollow',
    };
  }

  if (
    path === '/login' ||
    path === '/register' ||
    path.startsWith('/provider/login') ||
    path.startsWith('/portal/login') ||
    path.startsWith('/platform-admin/login')
  ) {
    return {
      title: path.includes('provider')
        ? 'Provider sign in | DoktoChain'
        : path.includes('admin')
          ? 'Admin sign in | DoktoChain'
          : 'Sign in | DoktoChain',
      description: 'Secure sign-in to your DoktoChain account.',
      robots: 'noindex,nofollow',
    };
  }

  const routes: { prefix: string; seo: SeoEntry }[] = [
    {
      prefix: '/',
      seo: {
        ...DEFAULT_SEO,
        jsonLd: buildMedicalOrganizationJsonLd(),
      },
    },
    {
      prefix: '/pricing',
      seo: {
        title: 'Pricing & plans | DoktoChain',
        description:
          'Transparent pricing for patients and providers. Founding member offers and subscription options for Canadian healthcare.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/for-business',
      seo: {
        title: 'For clinics & pharmacies | DoktoChain',
        description:
          'Bring your practice or pharmacy onto DoktoChain: scheduling, telehealth, prescriptions, and compliance.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/frontend/find-providers',
      seo: {
        title: 'Find healthcare providers | DoktoChain',
        description:
          'Search and book trusted doctors and specialists across Canada on DoktoChain.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/frontend/about',
      seo: {
        title: 'About DoktoChain',
        description:
          'Learn how DoktoChain connects patients, providers, and pharmacies with privacy-first Canadian healthcare technology.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/frontend/help',
      seo: {
        title: 'Help center | DoktoChain',
        description: 'Get help using DoktoChain: appointments, records, billing, and support.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/frontend/browse/specialties',
      seo: {
        title: 'Medical specialties | DoktoChain',
        description: 'Browse medical specialties and find the right care on DoktoChain.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/frontend/browse/procedures',
      seo: {
        title: 'Medical procedures | DoktoChain',
        description: 'Explore procedures and services available through DoktoChain providers.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/frontend/provider-profile',
      seo: {
        title: 'Provider profile | DoktoChain',
        description: 'View provider details, availability, and book care on DoktoChain.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/legal/privacy-policy',
      seo: {
        title: 'Privacy policy | DoktoChain',
        description: 'How DoktoChain collects, uses, and protects your personal information.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/legal/terms-of-service',
      seo: {
        title: 'Terms of service | DoktoChain',
        description: 'Terms governing use of the DoktoChain platform and services.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/legal/cookie-policy',
      seo: {
        title: 'Cookie policy | DoktoChain',
        description: 'How DoktoChain uses cookies and similar technologies.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/legal/accessibility',
      seo: {
        title: 'Accessibility | DoktoChain',
        description: 'Accessibility commitment and options for using DoktoChain.',
        robots: 'index,follow',
      },
    },
    {
      prefix: '/legal/refund-policy',
      seo: {
        title: 'Refund policy | DoktoChain',
        description: 'Refund and cancellation policy for DoktoChain services.',
        robots: 'index,follow',
      },
    },
  ];

  const sorted = [...routes].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { prefix, seo } of sorted) {
    if (prefix === '/' && path === '/') {
      return { ...seo };
    }
    if (prefix !== '/' && (path === prefix || path.startsWith(`${prefix}/`))) {
      return { ...seo };
    }
  }

  return { ...DEFAULT_SEO };
}

export function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = attr === 'name' ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function upsertLinkRel(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]:not([hreflang])`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function setJsonLd(id: string, data: Record<string, unknown> | null) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  const json = JSON.stringify(data);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = json;
}

export function getLocaleAlternates(pathname: string): { hreflang: string; href: string }[] {
  const path = stripLangPrefix(pathname) || '/';
  if (path.startsWith('/dashboard')) return [];
  const suffix = path === '/' ? '/' : path;
  return [
    { hreflang: 'en-CA', href: absoluteUrl(`/en${suffix}`) },
    { hreflang: 'fr-CA', href: absoluteUrl(`/fr${suffix}`) },
    { hreflang: 'x-default', href: absoluteUrl(`/en${suffix}`) },
  ];
}

export function setHreflangAlternates(alts: { hreflang: string; href: string }[]) {
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((el) => el.remove());
  alts.forEach(({ hreflang, href }) => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', href);
    document.head.appendChild(el);
  });
}

export type SeoOverride = Partial<SeoEntry> | null;

let currentOverride: SeoOverride = null;
const listeners = new Set<() => void>();

export function setPageSeo(override: SeoOverride): void {
  currentOverride = override;
  listeners.forEach((l) => l());
}

export function clearPageSeo(): void {
  setPageSeo(null);
}

export function getPageSeoOverride(): SeoOverride {
  return currentOverride;
}

export function subscribeSeo(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function mergeSeo(base: SeoEntry, override: SeoOverride): SeoEntry {
  if (!override) return base;
  return {
    ...base,
    ...('title' in override && override.title ? { title: override.title } : {}),
    ...('description' in override && override.description
      ? { description: override.description }
      : {}),
    ...('robots' in override && override.robots ? { robots: override.robots } : {}),
    ...('image' in override && override.image ? { image: override.image } : {}),
    ...('jsonLd' in override && override.jsonLd ? { jsonLd: override.jsonLd } : {}),
  };
}
