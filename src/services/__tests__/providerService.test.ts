import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), or: vi.fn(),
    order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { providerService } = await import('../providerService');

describe('providerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchProviders', () => {
    it('queries active verified providers', async () => {
      const providers = [{ id: 'p1', is_active: true, is_verified: true }];
      const chain = chainMock({ data: providers, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.searchProviders({});
      expect(result).toEqual(providers);
      expect(supabase.from).toHaveBeenCalledWith('providers');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
      expect(chain.eq).toHaveBeenCalledWith('is_verified', true);
    });

    it('filters by acceptsNewPatients when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await providerService.searchProviders({ acceptsNewPatients: true });
      expect(chain.eq).toHaveBeenCalledWith('accepts_new_patients', true);
    });

    it('returns empty array when data is null', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.searchProviders({});
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('DB error') });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await expect(providerService.searchProviders({})).rejects.toThrow('DB error');
    });
  });

  describe('getProvider', () => {
    it('returns provider by id with relations', async () => {
      const provider = { id: 'p1', user_id: 'u1' };
      const chain = chainMock({ data: provider, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getProvider('p1');
      expect(result).toEqual(provider);
      expect(chain.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('returns null when not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getProvider('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getProviderByUserId', () => {
    it('queries by user_id', async () => {
      const provider = { id: 'p1', user_id: 'u1' };
      const chain = chainMock({ data: provider, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getProviderByUserId('u1');
      expect(result).toEqual(provider);
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    });
  });

  describe('createProvider', () => {
    it('inserts and returns provider data', async () => {
      const provider = { id: 'p1', user_id: 'u1' };
      const chain = chainMock({ data: provider, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.createProvider({ user_id: 'u1' });
      expect(result).toEqual(provider);
      expect(supabase.from).toHaveBeenCalledWith('providers');
    });
  });

  describe('updateProvider', () => {
    it('updates provider fields', async () => {
      const provider = { id: 'p1', bio: 'Updated bio' };
      const chain = chainMock({ data: provider, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.updateProvider('p1', { bio: 'Updated bio' });
      expect(result).toEqual(provider);
      expect(chain.eq).toHaveBeenCalledWith('id', 'p1');
    });
  });

  describe('getLocations', () => {
    it('returns locations ordered by is_primary', async () => {
      const locations = [{ id: 'loc1', is_primary: true }];
      const chain = chainMock({ data: locations, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getLocations('p1');
      expect(result).toEqual(locations);
      expect(supabase.from).toHaveBeenCalledWith('provider_locations');
      expect(chain.order).toHaveBeenCalledWith('is_primary', { ascending: false });
    });

    it('returns empty array when no locations', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getLocations('p1');
      expect(result).toEqual([]);
    });
  });

  describe('addLocation', () => {
    it('inserts new location', async () => {
      const location = { id: 'loc1', provider_id: 'p1', city: 'Toronto' };
      const chain = chainMock({ data: location, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.addLocation({ provider_id: 'p1', city: 'Toronto' } as any);
      expect(result).toEqual(location);
      expect(supabase.from).toHaveBeenCalledWith('provider_locations');
    });
  });

  describe('getSchedule', () => {
    it('queries available schedules', async () => {
      const schedules = [{ id: 's1', day_of_week: 1 }];
      const chain = chainMock({ data: schedules, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getSchedule('p1');
      expect(result).toEqual(schedules);
      expect(supabase.from).toHaveBeenCalledWith('provider_schedules');
      expect(chain.eq).toHaveBeenCalledWith('is_available', true);
    });

    it('filters by locationId when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await providerService.getSchedule('p1', 'loc1');
      expect(chain.eq).toHaveBeenCalledWith('location_id', 'loc1');
    });
  });

  describe('deleteSchedule', () => {
    it('deletes schedule by id', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await providerService.deleteSchedule('s1');
      expect(supabase.from).toHaveBeenCalledWith('provider_schedules');
      expect(chain.eq).toHaveBeenCalledWith('id', 's1');
    });
  });

  describe('getReviews', () => {
    it('returns published reviews ordered by date', async () => {
      const reviews = [{ id: 'r1', rating: 5 }];
      const chain = chainMock({ data: reviews, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await providerService.getReviews('p1');
      expect(result).toEqual(reviews);
      expect(supabase.from).toHaveBeenCalledWith('provider_reviews');
      expect(chain.eq).toHaveBeenCalledWith('is_published', true);
    });
  });
});
