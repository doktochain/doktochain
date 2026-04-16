import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  getSiteOrigin,
  resolveSeo,
  setJsonLd,
  upsertLinkRel,
  upsertMeta,
} from '../../lib/seo';

const OG_IMAGE_PATH = '/image/Thumpnail_i_540x540.png';

export function DynamicSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);
    const origin = getSiteOrigin();
    const canonical = `${origin}${pathname.split('#')[0]}`;
    const ogImage = absoluteUrl(OG_IMAGE_PATH);

    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.robots);

    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:locale', pathname.startsWith('/fr') ? 'fr_CA' : 'en_CA');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertLinkRel('canonical', canonical);

    if (seo.jsonLd) {
      setJsonLd('doktochain-jsonld', seo.jsonLd);
    } else {
      setJsonLd('doktochain-jsonld', null);
    }
  }, [pathname]);

  return null;
}
