import { useEffect } from 'react';
import { clearPageSeo, setPageSeo, type SeoEntry } from '../lib/seo';

export function usePageSeo(
  entry: Partial<SeoEntry> | null | undefined,
  deps: ReadonlyArray<unknown> = []
): void {
  useEffect(() => {
    if (entry && (entry.title || entry.description || entry.jsonLd || entry.image || entry.robots)) {
      setPageSeo(entry);
    } else {
      clearPageSeo();
    }
    return () => {
      clearPageSeo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
