import { useCallback, useState } from 'react';
import {
  providerSearchService,
  ProviderSearchFilters,
  ProviderSearchResult,
} from '../services/providerSearchService';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useSupabaseMutation } from './useSupabaseMutation';

export function useProviderSearch(initialFilters: ProviderSearchFilters = {}) {
  const [filters, setFilters] = useState<ProviderSearchFilters>(initialFilters);

  const queryFn = useCallback(
    () => providerSearchService.searchProviders(filters),
    [JSON.stringify(filters)]
  );

  const result = useSupabaseQuery<ProviderSearchResult[]>(queryFn, [JSON.stringify(filters)]);

  return { ...result, filters, setFilters };
}

export function useSpecialties() {
  const queryFn = useCallback(() => providerSearchService.getAllSpecialties(), []);
  return useSupabaseQuery<string[]>(queryFn, []);
}

export function useNextAvailableSlot(providerId: string | null) {
  const queryFn = useCallback(
    () =>
      providerId ? providerSearchService.getNextAvailableSlot(providerId) : Promise.resolve(null),
    [providerId]
  );
  return useSupabaseQuery<string | null>(providerId ? queryFn : null, [providerId]);
}

export function useGeocodePostalCode() {
  return useSupabaseMutation<{ latitude: number; longitude: number } | null, string>(
    (postalCode) => providerSearchService.geocodePostalCode(postalCode)
  );
}
