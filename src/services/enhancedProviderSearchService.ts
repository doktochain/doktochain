import { supabase } from '../lib/supabase';

export interface ProviderSearchFilters {
  query?: string;
  specialty?: string;
  city?: string;
  province?: string;
  availability?: 'today' | 'tomorrow' | 'this_week' | 'next_week';
  insuranceProviders?: string[];
  consultationType?: 'virtual' | 'in_person' | 'both';
  languages?: string[];
  gender?: string;
  acceptingNewPatients?: boolean;
  minRating?: number;
}

export interface ProviderSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  providerType: string;
  professionalTitle: string;
  photo: string | null;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  nextAvailable: string | null;
  acceptingNewPatients: boolean;
  insuranceAccepted: string[];
  languages: string[];
  bio: string;
  consultationFee: number | null;
  virtualFee: number | null;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    province: string;
    acceptsInPerson: boolean;
    acceptsVirtual: boolean;
  }>;
}

export const enhancedProviderSearchService = {
  async searchProviders(
    filters: ProviderSearchFilters,
    page: number = 1,
    pageSize: number = 20,
    sortBy: 'rating' | 'availability' | 'price' | 'experience' = 'rating'
  ): Promise<{ providers: ProviderSearchResult[]; total: number }> {
    try {
      let query = supabase
        .from('providers')
        .select(`
          id,
          specialty,
          provider_type,
          professional_title,
          bio,
          years_of_experience,
          languages_spoken,
          accepts_new_patients,
          consultation_fee_cents,
          virtual_consultation_fee_cents,
          rating_average,
          rating_count,
          professional_photo_url,
          user_id,
          user_profiles!inner(
            first_name,
            last_name,
            profile_photo_url,
            gender
          ),
          provider_specialties(
            specialty,
            sub_specialty,
            is_primary
          ),
          provider_locations(
            id,
            location_name,
            address_line1,
            city,
            province,
            accepts_in_person,
            accepts_virtual
          ),
          provider_languages(
            language
          ),
          provider_insurance_accepted(
            insurance_provider
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .eq('is_verified', true);

      if (filters.specialty) {
        query = query.eq('specialty', filters.specialty);
      }

      if (filters.acceptingNewPatients) {
        query = query.eq('accepts_new_patients', true);
      }

      if (filters.gender && filters.gender !== 'any') {
        query = query.eq('user_profiles.gender', filters.gender);
      }

      const { data: providers, error, count } = await query;

      if (error) throw error;
      if (!providers) return { providers: [], total: 0 };

      let results: ProviderSearchResult[] = providers.map((p: any) => {
        const profile = p.user_profiles;
        const langs = (p.provider_languages || []).map((l: any) => l.language);
        const allLangs = [...new Set([...(p.languages_spoken || []), ...langs])];
        const insurance = (p.provider_insurance_accepted || []).map((i: any) => i.insurance_provider);
        const locations = (p.provider_locations || []).map((l: any) => ({
          id: l.id,
          name: l.location_name || '',
          address: l.address_line1 || '',
          city: l.city || '',
          province: l.province || '',
          acceptsInPerson: l.accepts_in_person || false,
          acceptsVirtual: l.accepts_virtual || false,
        }));

        return {
          id: p.id,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          specialty: p.specialty || p.provider_type || '',
          providerType: p.provider_type || '',
          professionalTitle: p.professional_title || '',
          photo: p.professional_photo_url || profile?.profile_photo_url || null,
          rating: parseFloat(p.rating_average) || 0,
          reviewCount: p.rating_count || 0,
          yearsExperience: p.years_of_experience || 0,
          nextAvailable: null,
          acceptingNewPatients: p.accepts_new_patients || false,
          insuranceAccepted: insurance,
          languages: allLangs,
          bio: p.bio || '',
          consultationFee: p.consultation_fee_cents,
          virtualFee: p.virtual_consultation_fee_cents,
          locations,
        };
      });

      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(p =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.specialty.toLowerCase().includes(q) ||
          p.professionalTitle.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
        );
      }

      if (filters.city) {
        const city = filters.city.toLowerCase();
        results = results.filter(p =>
          p.locations.some(l => l.city.toLowerCase().includes(city))
        );
      }

      if (filters.province) {
        results = results.filter(p =>
          p.locations.some(l => l.province === filters.province)
        );
      }

      if (filters.consultationType === 'virtual') {
        results = results.filter(p =>
          p.locations.some(l => l.acceptsVirtual)
        );
      } else if (filters.consultationType === 'in_person') {
        results = results.filter(p =>
          p.locations.some(l => l.acceptsInPerson)
        );
      }

      if (filters.insuranceProviders && filters.insuranceProviders.length > 0) {
        results = results.filter(p =>
          filters.insuranceProviders!.some(ins => p.insuranceAccepted.includes(ins))
        );
      }

      if (filters.languages && filters.languages.length > 0) {
        results = results.filter(p =>
          filters.languages!.some(lang => p.languages.includes(lang))
        );
      }

      if (filters.minRating) {
        results = results.filter(p => p.rating >= filters.minRating!);
      }

      if (results.length > 0) {
        const providerIds = results.map(p => p.id);
        const nextSlots = await this.getNextAvailableSlots(providerIds, filters.availability);
        results = results.map(p => ({
          ...p,
          nextAvailable: nextSlots[p.id] || null,
        }));

        if (filters.availability) {
          results = results.filter(p => p.nextAvailable !== null);
        }
      }

      results.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return b.rating - a.rating || b.reviewCount - a.reviewCount;
          case 'experience':
            return b.yearsExperience - a.yearsExperience;
          case 'price':
            return (a.consultationFee || 0) - (b.consultationFee || 0);
          case 'availability':
            if (!a.nextAvailable) return 1;
            if (!b.nextAvailable) return -1;
            return new Date(a.nextAvailable).getTime() - new Date(b.nextAvailable).getTime();
          default:
            return b.rating - a.rating;
        }
      });

      const start = (page - 1) * pageSize;
      const paged = results.slice(start, start + pageSize);

      return {
        providers: paged,
        total: results.length,
      };
    } catch (error) {
      console.error('Error searching providers:', error);
      throw error;
    }
  },

  async getNextAvailableSlots(
    providerIds: string[],
    availability?: 'today' | 'tomorrow' | 'this_week' | 'next_week'
  ): Promise<Record<string, string>> {
    if (providerIds.length === 0) return {};

    try {
      const now = new Date();
      const startDate = new Date();
      const endDate = new Date();

      switch (availability) {
        case 'today':
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'tomorrow':
          startDate.setDate(startDate.getDate() + 1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'this_week': {
          const daysUntilSunday = 7 - now.getDay();
          endDate.setDate(endDate.getDate() + daysUntilSunday);
          endDate.setHours(23, 59, 59, 999);
          break;
        }
        case 'next_week': {
          const daysUntilNextMonday = 7 - now.getDay() + 1;
          startDate.setDate(startDate.getDate() + daysUntilNextMonday);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        }
        default:
          endDate.setDate(endDate.getDate() + 30);
      }

      const { data: slots, error } = await supabase
        .from('provider_time_slots')
        .select('provider_id, slot_date, slot_time')
        .in('provider_id', providerIds)
        .eq('is_available', true)
        .gte('slot_date', startDate.toISOString().split('T')[0])
        .lte('slot_date', endDate.toISOString().split('T')[0])
        .order('slot_date', { ascending: true })
        .order('slot_time', { ascending: true });

      if (error) throw error;

      const nextSlots: Record<string, string> = {};
      if (slots) {
        for (const slot of slots) {
          if (!nextSlots[slot.provider_id]) {
            nextSlots[slot.provider_id] = `${slot.slot_date}T${slot.slot_time}`;
          }
        }
      }

      return nextSlots;
    } catch (error) {
      console.error('Error getting next available slots:', error);
      return {};
    }
  },

  async getSpecialties(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const { data, error } = await supabase
      .from('specialties_master')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getInsuranceProviders(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await supabase
      .from('insurance_providers_master')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAvailableLanguages(): Promise<string[]> {
    const { data, error } = await supabase
      .from('provider_languages')
      .select('language');

    if (error) throw error;
    const unique = [...new Set((data || []).map(l => l.language))].sort();
    return unique.length > 0 ? unique : ['English', 'French'];
  },
};
