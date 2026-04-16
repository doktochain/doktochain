import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  clearPageSeo,
  getDefaultOgImage,
  getLocaleAlternates,
  getPageSeoOverride,
  getSiteOrigin,
  mergeSeo,
  resolveSeo,
  setHreflangAlternates,
  setJsonLd,
  subscribeSeo,
  upsertLinkRel,
  upsertMeta,
} from '../../lib/seo';

export function DynamicSeo() {
  const { pathname } = useLocation();
  const [, forceTick] = useState(0);

  useEffect(() => {
    clearPageSeo();
  }, [pathname]);

  useEffect(() => {
    return subscribeSeo(() => forceTick((n) => n + 1));
  }, []);

  useEffect(() => {
    const base = resolveSeo(pathname);
    const seo = mergeSeo(base, getPageSeoOverride());
    const origin = getSiteOrigin();
    const canonicalPath = pathname.split('#')[0].split('?')[0];
    const canonical = `${origin}${canonicalPath}`;
    const ogImage = seo.image ? absoluteUrl(seo.image) : getDefaultOgImage();

    const locale = pathname.startsWith('/fr') ? 'fr_CA' : 'en_CA';
    const htmlLang = pathname.startsWith('/fr') ? 'fr-CA' : 'en-CA';
    document.documentElement.setAttribute('lang', htmlLang);

    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.robots);

    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:site_name', 'DoktoChain');
    upsertMeta('property', 'og:locale', locale);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertLinkRel('canonical', canonical);

    setHreflangAlternates(getLocaleAlternates(pathname));

    if (seo.jsonLd) {
      setJsonLd('doktochain-jsonld', seo.jsonLd);
    } else {
      setJsonLd('doktochain-jsonld', null);
    }

    const gsc = import.meta.env.VITE_GSC_VERIFICATION as string | undefined;
    if (gsc) upsertMeta('name', 'google-site-verification', gsc);
    const bing = import.meta.env.VITE_BING_VERIFICATION as string | undefined;
    if (bing) upsertMeta('name', 'msvalidate.01', bing);
  }, [pathname]);

  return null;
}
