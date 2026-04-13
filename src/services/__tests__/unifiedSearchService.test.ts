import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../lib/security', () => ({
  sanitizeSearchInput: vi.fn((input: string) => input.replace(/[<>"';]/g, '')),
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(), is: vi.fn(),
    order: vi.fn(), limit: vi.fn(), ilike: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

import { supabase } from '../../lib/supabase';
import { unifiedSearchService } from '../unifiedSearchService';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('unifiedSearchService', () => {
  describe('searchAll', () => {
    it('returns empty for empty query', async () => {
      const result = await unifiedSearchService.searchAll('');
      expect(result).toEqual([]);
    });

    it('returns empty for short query', async () => {
      const result = await unifiedSearchService.searchAll('a');
      expect(result).toEqual([]);
    });

    it('searches specialties, procedures, and services', async () => {
      const specialties = [{ id: 's1', name: 'Cardiology', description: 'Heart', category: 'Medical' }];
      const procedures = [{ id: 'p1', name: 'Cardiac Stress Test', description: 'Test', category: 'Diagnostic', duration_minutes: 60 }];
      const services = [{ id: 'sv1', service_name: 'Cardiac Consultation', description: 'Consult', category: 'Consultation', duration_minutes: 30, default_price: 200 }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'specialties_master') return chainMock({ data: specialties, error: null });
        if (table === 'procedures_master') return chainMock({ data: procedures, error: null });
        if (table === 'medical_services') return chainMock({ data: services, error: null });
        return chainMock({ data: [], error: null });
      });

      const result = await unifiedSearchService.searchAll('Cardiac');
      expect(result.length).toBe(3);
      expect(result.map(r => r.type)).toContain('specialty');
      expect(result.map(r => r.type)).toContain('procedure');
      expect(result.map(r => r.type)).toContain('service');
    });

    it('sorts exact matches first', async () => {
      const specialties = [
        { id: 's1', name: 'Dermatology', description: '', category: '' },
        { id: 's2', name: 'Cardiology', description: '', category: '' },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'specialties_master') return chainMock({ data: specialties, error: null });
        return chainMock({ data: [], error: null });
      });

      const result = await unifiedSearchService.searchAll('Cardiology');
      expect(result[0].name).toBe('Cardiology');
    });

    it('handles query errors gracefully', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await unifiedSearchService.searchAll('test query');
      expect(result).toEqual([]);
    });

    it('skips results from errored tables', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'specialties_master') return chainMock({ data: [{ id: 's1', name: 'Cardiology', description: '', category: '' }], error: null });
        if (table === 'procedures_master') return chainMock({ data: null, error: new Error('fail') });
        if (table === 'medical_services') return chainMock({ data: [], error: null });
        return chainMock({ data: [], error: null });
      });

      const result = await unifiedSearchService.searchAll('Cardiology');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('specialty');
    });
  });

  describe('searchLocations', () => {
    it('returns empty for short query', async () => {
      const result = await unifiedSearchService.searchLocations('ab');
      expect(result).toEqual([]);
    });

    it('returns empty for empty query', async () => {
      const result = await unifiedSearchService.searchLocations('');
      expect(result).toEqual([]);
    });

    it('returns locations from nominatim API', async () => {
      (globalThis.fetch as any).mockResolvedValue({
        json: () => Promise.resolve([
          { lat: '43.6532', lon: '-79.3832', name: 'Toronto', address: { city: 'Toronto', state: 'Ontario' } },
        ]),
      });

      const result = await unifiedSearchService.searchLocations('Toronto');
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Toronto');
      expect(result[0].province).toBe('Ontario');
    });

    it('handles API error gracefully', async () => {
      (globalThis.fetch as any).mockRejectedValue(new Error('Network'));
      const result = await unifiedSearchService.searchLocations('Toronto');
      expect(result).toEqual([]);
    });
  });

  describe('getInsuranceProviders', () => {
    it('returns active providers sorted by name', async () => {
      const providers = [{ id: 'ip1', name: 'Sun Life' }];
      const chain = chainMock({ data: providers, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await unifiedSearchService.getInsuranceProviders();
      expect(result).toEqual(providers);
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('returns empty array on error', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: new Error('fail') }));
      const result = await unifiedSearchService.getInsuranceProviders();
      expect(result).toEqual([]);
    });
  });

  describe('searchInsuranceProviders', () => {
    it('returns all providers for empty query', async () => {
      const providers = [{ id: 'ip1', name: 'Sun Life' }];
      const chain = chainMock({ data: providers, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await unifiedSearchService.searchInsuranceProviders('');
      expect(result).toEqual(providers);
    });

    it('filters by name when query provided', async () => {
      const providers = [{ id: 'ip1', name: 'Sun Life' }];
      const chain = chainMock({ data: providers, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await unifiedSearchService.searchInsuranceProviders('Sun');
      expect(result).toEqual(providers);
      expect(chain.ilike).toHaveBeenCalled();
    });
  });

  describe('geocodeLocation', () => {
    it('returns coordinates for a location', async () => {
      (globalThis.fetch as any).mockResolvedValue({
        json: () => Promise.resolve([
          { lat: '43.6532', lon: '-79.3832', address: { city: 'Toronto', state: 'Ontario' } },
        ]),
      });

      const result = await unifiedSearchService.geocodeLocation('Toronto, ON');
      expect(result).not.toBeNull();
      expect(result!.latitude).toBeCloseTo(43.6532);
      expect(result!.longitude).toBeCloseTo(-79.3832);
    });

    it('returns null when no results', async () => {
      (globalThis.fetch as any).mockResolvedValue({ json: () => Promise.resolve([]) });
      const result = await unifiedSearchService.geocodeLocation('Nonexistent');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      (globalThis.fetch as any).mockRejectedValue(new Error('fail'));
      const result = await unifiedSearchService.geocodeLocation('Toronto');
      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('returns location from coordinates', async () => {
      (globalThis.fetch as any).mockResolvedValue({
        json: () => Promise.resolve({
          address: { city: 'Toronto', state: 'Ontario' },
        }),
      });

      const result = await unifiedSearchService.reverseGeocode(43.6532, -79.3832);
      expect(result).not.toBeNull();
      expect(result!.city).toBe('Toronto');
    });

    it('returns null on error', async () => {
      (globalThis.fetch as any).mockRejectedValue(new Error('fail'));
      const result = await unifiedSearchService.reverseGeocode(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('findProvidersBySearchCriteria', () => {
    it('finds providers by specialty', async () => {
      const specProviders = [{ provider_id: 'prov1' }];
      const providers = [{ id: 'prov1', rating: 4.5, latitude: 43.6, longitude: -79.3, accepts_new_patients: true }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'provider_specialties') return chainMock({ data: specProviders, error: null });
        if (table === 'providers') return chainMock({ data: providers, error: null });
        return chainMock({ data: [], error: null });
      });

      const result = await unifiedSearchService.findProvidersBySearchCriteria({
        searchType: 'specialty',
        searchId: 'spec1',
      });

      expect(result).toHaveLength(1);
    });

    it('returns empty when no providers found', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: [], error: null }));

      const result = await unifiedSearchService.findProvidersBySearchCriteria({
        searchType: 'procedure',
        searchId: 'proc1',
      });
      expect(result).toEqual([]);
    });

    it('calculates distance when location provided', async () => {
      const specProviders = [{ provider_id: 'prov1' }];
      const providers = [{ id: 'prov1', rating: 4.5, latitude: 43.7, longitude: -79.4, accepts_new_patients: true }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'provider_specialties') return chainMock({ data: specProviders, error: null });
        if (table === 'providers') return chainMock({ data: providers, error: null });
        return chainMock({ data: [], error: null });
      });

      const result = await unifiedSearchService.findProvidersBySearchCriteria({
        searchType: 'specialty',
        searchId: 'spec1',
        location: { latitude: 43.6, longitude: -79.3, city: 'Toronto', province: 'Ontario', displayName: 'Toronto, Ontario' },
      });

      expect(result[0].distance).toBeDefined();
      expect(typeof result[0].distance).toBe('number');
    });

    it('handles errors gracefully', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('fail');
      });

      const result = await unifiedSearchService.findProvidersBySearchCriteria({
        searchType: 'service',
        searchId: 'svc1',
      });
      expect(result).toEqual([]);
    });
  });
});
