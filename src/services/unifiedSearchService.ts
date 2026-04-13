import { supabase } from '../lib/supabase';
import { sanitizeSearchInput } from '../lib/security';

export interface SearchResult {
  id: string;
  name: string;
  type: 'specialty' | 'procedure' | 'service';
  description?: string;
  category?: string;
  duration_minutes?: number;
  default_price?: number;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  provider_type: string;
  description: string | null;
  provinces_covered: string[];
  is_active: boolean;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city: string;
  province: string;
  displayName: string;
}

class UnifiedSearchService {
  async searchLocations(query: string): Promise<LocationCoordinates[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=ca&limit=5&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return data.map((result: any) => {
          const address = result.address || {};

          const city = address.city ||
                      address.town ||
                      address.village ||
                      address.municipality ||
                      address.county ||
                      address.suburb ||
                      address.neighbourhood ||
                      result.name ||
                      query.split(',')[0].trim();

          const province = address.state ||
                          address.province ||
                          address.region ||
                          'Ontario';

          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            city,
            province,
            displayName: `${city}, ${province}`,
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  async searchAll(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = sanitizeSearchInput(query.trim());
    if (searchTerm.length < 2) return [];

    const results: SearchResult[] = [];

    try {
      const { data: specialties, error: specError } = await supabase
        .from('specialties_master')
        .select('id, name, description, category')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);

      if (!specError && specialties) {
        results.push(
          ...specialties.map((s) => ({
            id: s.id,
            name: s.name,
            type: 'specialty' as const,
            description: s.description,
            category: s.category,
          }))
        );
      }

      const { data: procedures, error: procError } = await supabase
        .from('procedures_master')
        .select('id, name, description, category, duration_minutes')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);

      if (!procError && procedures) {
        results.push(
          ...procedures.map((p) => ({
            id: p.id,
            name: p.name,
            type: 'procedure' as const,
            description: p.description,
            category: p.category,
            duration_minutes: p.duration_minutes,
          }))
        );
      }

      const { data: services, error: servError } = await supabase
        .from('medical_services')
        .select('id, service_name, description, category, duration_minutes, default_price')
        .or(`service_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(10);

      if (!servError && services) {
        results.push(
          ...services.map((s) => ({
            id: s.id,
            name: s.service_name,
            type: 'service' as const,
            description: s.description,
            category: s.category,
            duration_minutes: s.duration_minutes,
            default_price: s.default_price,
          }))
        );
      }

      // Sort by relevance (exact matches first)
      return results.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchTerm.toLowerCase();
        const bExact = b.name.toLowerCase() === searchTerm.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = a.name.toLowerCase().startsWith(searchTerm.toLowerCase());
        const bStarts = b.name.toLowerCase().startsWith(searchTerm.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error in unified search:', error);
      return [];
    }
  }

  async getInsuranceProviders(): Promise<InsuranceProvider[]> {
    const { data, error } = await supabase
      .from('insurance_providers_master')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching insurance providers:', error);
      return [];
    }

    return data || [];
  }

  async searchInsuranceProviders(query: string): Promise<InsuranceProvider[]> {
    if (!query || query.trim().length < 1) {
      return this.getInsuranceProviders();
    }

    const safeQuery = sanitizeSearchInput(query);
    const { data, error } = await supabase
      .from('insurance_providers_master')
      .select('*')
      .eq('is_active', true)
      .ilike('name', `%${safeQuery}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching insurance providers:', error);
      return [];
    }

    return data || [];
  }

  async geocodeLocation(locationQuery: string): Promise<LocationCoordinates | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          locationQuery
        )}&countrycodes=ca&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const address = result.address || {};

        // Extract city - try multiple fields
        const city = address.city ||
                    address.town ||
                    address.village ||
                    address.municipality ||
                    address.county ||
                    address.suburb ||
                    address.neighbourhood ||
                    result.name ||
                    locationQuery.split(',')[0].trim();

        // Extract province/state - handle Canadian provinces
        const province = address.state ||
                        address.province ||
                        address.region ||
                        'Ontario'; // Default for demo

        // Create a cleaner display name
        const displayName = `${city}, ${province}`;

        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          city,
          province,
          displayName,
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<LocationCoordinates | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.address) {
        const address = data.address;

        // Extract city - try multiple fields
        const city = address.city ||
                    address.town ||
                    address.village ||
                    address.municipality ||
                    address.county ||
                    address.suburb ||
                    address.neighbourhood ||
                    'Current Location';

        // Extract province/state
        const province = address.state ||
                        address.province ||
                        address.region ||
                        'Canada';

        const displayName = `${city}, ${province}`;

        return {
          latitude,
          longitude,
          city,
          province,
          displayName,
        };
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  async findProvidersBySearchCriteria(
    searchCriteria: {
      searchType: 'specialty' | 'procedure' | 'service';
      searchId: string;
      location?: LocationCoordinates;
      insuranceProviderId?: string;
      maxDistance?: number;
    }
  ): Promise<any[]> {
    const { searchType, searchId, location, insuranceProviderId, maxDistance = 50 } = searchCriteria;

    let providerIds: string[] = [];

    try {
      if (searchType === 'specialty') {
        // Find providers with this specialty
        const { data, error } = await supabase
          .from('provider_specialties')
          .select('provider_id')
          .eq('specialty_id', searchId);

        if (!error && data) {
          providerIds = data.map((ps) => ps.provider_id);
        }
      } else if (searchType === 'procedure') {
        // Find providers offering this procedure
        const { data, error } = await supabase
          .from('provider_procedures')
          .select('provider_id')
          .eq('procedure_id', searchId);

        if (!error && data) {
          providerIds = data.map((pp) => pp.provider_id);
        }
      } else if (searchType === 'service') {
        // Find providers offering this service
        const { data, error } = await supabase
          .from('provider_services')
          .select('provider_id')
          .eq('medical_service_id', searchId);

        if (!error && data) {
          providerIds = data.map((ps) => ps.provider_id);
        }
      }

      if (providerIds.length === 0) {
        return [];
      }

      // Get provider details
      let query = supabase
        .from('providers')
        .select(
          `
          id,
          user_id,
          specialization,
          license_number,
          years_of_experience,
          rating,
          review_count,
          city,
          province,
          latitude,
          longitude,
          accepts_new_patients,
          virtual_consultations_available,
          user_profiles:user_id (
            first_name,
            last_name,
            profile_photo_url
          )
        `
        )
        .in('id', providerIds)
        .eq('accepts_new_patients', true);

      const { data: providers, error: providersError } = await query;

      if (providersError || !providers) {
        return [];
      }

      // Calculate distances if location provided
      const providersWithDistance = providers.map((provider) => {
        let distance: number | undefined;
        if (location && provider.latitude && provider.longitude) {
          distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            provider.latitude,
            provider.longitude
          );
        }

        return {
          ...provider,
          distance,
        };
      });

      // Filter by distance if specified
      let filteredProviders = providersWithDistance;
      if (location) {
        filteredProviders = providersWithDistance.filter(
          (p) => p.distance === undefined || p.distance <= maxDistance
        );
      }

      // Filter by insurance if specified
      if (insuranceProviderId) {
        const { data: insuranceData } = await supabase
          .from('provider_insurance_plans')
          .select('provider_id')
          .eq('insurance_provider_id', insuranceProviderId);

        if (insuranceData) {
          const insuranceProviderIds = insuranceData.map((ip) => ip.provider_id);
          filteredProviders = filteredProviders.filter((p) => insuranceProviderIds.includes(p.id));
        }
      }

      // Sort by distance (closest first) or rating
      filteredProviders.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return (b.rating || 0) - (a.rating || 0);
      });

      return filteredProviders;
    } catch (error) {
      console.error('Error finding providers:', error);
      return [];
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const unifiedSearchService = new UnifiedSearchService();
