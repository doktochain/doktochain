import { supabase } from '../lib/supabase';
import { sanitizeSearchInput } from '../lib/security';

export interface ProviderSearchFilters {
  searchQuery?: string;
  specialty?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number; // in km
  };
  postalCode?: string;
  availability?: 'today' | 'tomorrow' | 'this_week' | 'next_week';
  insuranceAccepted?: string[];
  appointmentType?: 'in-person' | 'virtual';
  languages?: string[];
  gender?: string;
  acceptingNewPatients?: boolean;
  minRating?: number;
}

export interface ProviderSearchResult {
  id: string;
  user_profiles: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  provider_type: string;
  professional_title: string;
  bio: string;
  years_of_experience: number;
  languages_spoken: string[];
  accepts_new_patients: boolean;
  consultation_fee_cents: number;
  rating_average: number;
  rating_count: number;
  specialties: Array<{
    specialty: string;
    sub_specialty: string;
    is_primary: boolean;
  }>;
  locations: Array<{
    id: string;
    location_name: string;
    address_line1: string;
    city: string;
    province: string;
    postal_code: string;
    latitude: number;
    longitude: number;
    accepts_in_person: boolean;
    accepts_virtual: boolean;
  }>;
  next_available_slot?: string;
  distance_km?: number;
}

export const providerSearchService = {
  // Main search function
  async searchProviders(filters: ProviderSearchFilters): Promise<ProviderSearchResult[]> {
    let query = supabase
      .from('providers')
      .select(`
        id,
        user_profiles!inner(first_name, last_name, profile_photo_url, gender),
        provider_type,
        professional_title,
        bio,
        years_of_experience,
        languages_spoken,
        accepts_new_patients,
        consultation_fee_cents,
        rating_average,
        rating_count,
        is_verified,
        is_active,
        provider_specialties(specialty, sub_specialty, is_primary),
        provider_locations(
          id,
          location_name,
          address_line1,
          city,
          province,
          postal_code,
          latitude,
          longitude,
          accepts_in_person,
          accepts_virtual
        )
      `)
      .eq('is_active', true)
      .eq('is_verified', true);

    if (filters.searchQuery) {
      const safeQuery = sanitizeSearchInput(filters.searchQuery);
      if (safeQuery.length > 0) {
        query = query.or(
          `user_profiles.first_name.ilike.%${safeQuery}%,user_profiles.last_name.ilike.%${safeQuery}%`
        );
      }
    }

    // Filter by accepting new patients
    if (filters.acceptingNewPatients) {
      query = query.eq('accepts_new_patients', true);
    }

    // Filter by minimum rating
    if (filters.minRating) {
      query = query.gte('rating_average', filters.minRating);
    }

    // Filter by gender
    if (filters.gender) {
      query = query.eq('user_profiles.gender', filters.gender);
    }

    const { data, error } = await query;

    if (error) throw error;

    let results = data as ProviderSearchResult[];

    // Post-query filtering (for complex filters)

    // Filter by specialty
    if (filters.specialty) {
      results = results.filter((provider) =>
        provider.specialties?.some(
          (s) =>
            s.specialty.toLowerCase().includes(filters.specialty!.toLowerCase()) ||
            s.sub_specialty?.toLowerCase().includes(filters.specialty!.toLowerCase())
        )
      );
    }

    // Filter by languages
    if (filters.languages && filters.languages.length > 0) {
      results = results.filter((provider) =>
        filters.languages!.some((lang) => provider.languages_spoken?.includes(lang))
      );
    }

    // Filter by appointment type
    if (filters.appointmentType) {
      results = results.filter((provider) =>
        provider.locations?.some((loc) =>
          filters.appointmentType === 'virtual'
            ? loc.accepts_virtual
            : loc.accepts_in_person
        )
      );
    }

    // Filter by postal code proximity
    if (filters.postalCode) {
      results = results.filter((provider) =>
        provider.locations?.some((loc) =>
          loc.postal_code.substring(0, 3).toUpperCase() ===
          filters.postalCode!.substring(0, 3).toUpperCase()
        )
      );
    }

    // Calculate distance if location provided
    if (filters.location) {
      results = results.map((provider) => {
        const closestLocation = provider.locations?.reduce((closest, loc) => {
          if (!loc.latitude || !loc.longitude) return closest;

          const distance = this.calculateDistance(
            filters.location!.latitude,
            filters.location!.longitude,
            loc.latitude,
            loc.longitude
          );

          if (!closest || distance < closest.distance) {
            return { location: loc, distance };
          }
          return closest;
        }, null as { location: any; distance: number } | null);

        return {
          ...provider,
          distance_km: closestLocation?.distance,
        };
      });

      // Filter by radius
      if (filters.location.radius) {
        results = results.filter(
          (p) => p.distance_km !== undefined && p.distance_km <= filters.location!.radius!
        );
      }

      // Sort by distance
      results.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
    }

    return results;
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Get all specialties for filter dropdown
  async getAllSpecialties(): Promise<string[]> {
    const { data, error } = await supabase
      .from('provider_specialties')
      .select('specialty')
      .order('specialty');

    if (error) throw error;

    const uniqueSpecialties = [...new Set(data.map((s) => s.specialty))];
    return uniqueSpecialties;
  },

  // Get next available slot for a provider
  async getNextAvailableSlot(providerId: string): Promise<string | null> {
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_date, start_time')
      .eq('provider_id', providerId)
      .gte('appointment_date', today.toISOString().split('T')[0])
      .lte('appointment_date', twoWeeksFromNow.toISOString().split('T')[0])
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date')
      .order('start_time')
      .limit(1);

    if (error) return null;
    if (!data || data.length === 0) {
      return 'Available today';
    }

    const nextBooked = new Date(data[0].appointment_date);
    const daysUntil = Math.ceil((nextBooked.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil === 0) return 'Available today';
    if (daysUntil === 1) return 'Available tomorrow';
    if (daysUntil <= 7) return `Available in ${daysUntil} days`;
    return `Available ${nextBooked.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  },

  // Geocode postal code to coordinates (mock - integrate with Google Maps API)
  async geocodePostalCode(postalCode: string): Promise<{ latitude: number; longitude: number } | null> {
    // Mock implementation - in production, use Google Maps Geocoding API
    const mockCoordinates: Record<string, { latitude: number; longitude: number }> = {
      M5H: { latitude: 43.6532, longitude: -79.3832 }, // Toronto
      V6B: { latitude: 49.2827, longitude: -123.1207 }, // Vancouver
      H3B: { latitude: 45.5017, longitude: -73.5673 }, // Montreal
      T2P: { latitude: 51.0447, longitude: -114.0719 }, // Calgary
      K1A: { latitude: 45.4215, longitude: -75.6972 }, // Ottawa
    };

    const prefix = postalCode.substring(0, 3).toUpperCase();
    return mockCoordinates[prefix] || null;
  },

  // Get user's current location
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          resolve(null);
        }
      );
    });
  },
};
