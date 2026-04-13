import { api } from '../lib/api-client';
import { sanitizeSearchInput } from '../lib/security';

export interface ProviderSearchFilters {
  searchQuery?: string;
  specialty?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
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
  async searchProviders(filters: ProviderSearchFilters): Promise<ProviderSearchResult[]> {
    const params: Record<string, any> = {
      is_active: true,
      is_verified: true,
      include: 'user_profiles,provider_specialties,provider_locations',
    };

    if (filters.searchQuery) {
      const safeQuery = sanitizeSearchInput(filters.searchQuery);
      if (safeQuery.length > 0) {
        params.search = safeQuery;
      }
    }

    if (filters.acceptingNewPatients) {
      params.accepts_new_patients = true;
    }

    if (filters.minRating) {
      params.rating_average_gte = filters.minRating;
    }

    if (filters.gender) {
      params.gender = filters.gender;
    }

    const { data, error } = await api.get<ProviderSearchResult[]>('/providers', { params });

    if (error) throw error;

    let results = data as ProviderSearchResult[];

    if (filters.specialty) {
      results = results.filter((provider) =>
        provider.specialties?.some(
          (s) =>
            s.specialty.toLowerCase().includes(filters.specialty!.toLowerCase()) ||
            s.sub_specialty?.toLowerCase().includes(filters.specialty!.toLowerCase())
        )
      );
    }

    if (filters.languages && filters.languages.length > 0) {
      results = results.filter((provider) =>
        filters.languages!.some((lang) => provider.languages_spoken?.includes(lang))
      );
    }

    if (filters.appointmentType) {
      results = results.filter((provider) =>
        provider.locations?.some((loc) =>
          filters.appointmentType === 'virtual'
            ? loc.accepts_virtual
            : loc.accepts_in_person
        )
      );
    }

    if (filters.postalCode) {
      results = results.filter((provider) =>
        provider.locations?.some((loc) =>
          loc.postal_code.substring(0, 3).toUpperCase() ===
          filters.postalCode!.substring(0, 3).toUpperCase()
        )
      );
    }

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

      if (filters.location.radius) {
        results = results.filter(
          (p) => p.distance_km !== undefined && p.distance_km <= filters.location!.radius!
        );
      }

      results.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
    }

    return results;
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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

  async getAllSpecialties(): Promise<string[]> {
    const { data, error } = await api.get<any[]>('/provider-specialties', {
      params: { select: 'specialty', order_by: 'specialty:asc' },
    });

    if (error) throw error;

    const uniqueSpecialties = [...new Set(data!.map((s) => s.specialty))];
    return uniqueSpecialties;
  },

  async getNextAvailableSlot(providerId: string): Promise<string | null> {
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    const { data, error } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        appointment_date_gte: today.toISOString().split('T')[0],
        appointment_date_lte: twoWeeksFromNow.toISOString().split('T')[0],
        status: 'scheduled,confirmed',
        order_by: 'appointment_date:asc,start_time:asc',
        limit: 1,
        select: 'appointment_date,start_time',
      },
    });

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

  async geocodePostalCode(postalCode: string): Promise<{ latitude: number; longitude: number } | null> {
    const mockCoordinates: Record<string, { latitude: number; longitude: number }> = {
      M5H: { latitude: 43.6532, longitude: -79.3832 },
      V6B: { latitude: 49.2827, longitude: -123.1207 },
      H3B: { latitude: 45.5017, longitude: -73.5673 },
      T2P: { latitude: 51.0447, longitude: -114.0719 },
      K1A: { latitude: 45.4215, longitude: -75.6972 },
    };

    const prefix = postalCode.substring(0, 3).toUpperCase();
    return mockCoordinates[prefix] || null;
  },

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
