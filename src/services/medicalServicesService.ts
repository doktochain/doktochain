import { supabase } from '../lib/supabase';
import { adminCRUDService } from './adminCRUDService';

export interface MedicalService {
  id?: string;
  service_name: string;
  service_code?: string;
  description?: string;
  category?: string;
  duration_minutes?: number;
  requires_lab_work?: boolean;
  is_telemedicine_eligible?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProviderServicePricing {
  id?: string;
  provider_id: string;
  service_id: string;
  base_price: number;
  currency?: string;
  is_available?: boolean;
  custom_duration?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

class MedicalServicesService {
  async getAllServices(includeInactive: boolean = false): Promise<MedicalService[]> {
    let query = supabase
      .from('medical_services')
      .select('*')
      .is('deleted_at', null)
      .order('service_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getServiceById(id: string): Promise<MedicalService> {
    return await adminCRUDService.getById('medical_services', id);
  }

  async createService(service: Omit<MedicalService, 'id' | 'created_at' | 'updated_at'>): Promise<MedicalService> {
    return await adminCRUDService.create('medical_services', service);
  }

  async updateService(id: string, updates: Partial<MedicalService>): Promise<MedicalService> {
    const currentData = await this.getServiceById(id);
    return await adminCRUDService.update('medical_services', id, updates, currentData);
  }

  async deleteService(id: string, reason?: string): Promise<void> {
    await adminCRUDService.softDelete('medical_services', id, reason);
  }

  async restoreService(id: string): Promise<MedicalService> {
    return await adminCRUDService.restore('medical_services', id);
  }

  async toggleServiceStatus(id: string, isActive: boolean): Promise<void> {
    const currentData = await this.getServiceById(id);
    await adminCRUDService.update('medical_services', id, { is_active: isActive }, currentData);
  }

  async getServicesByCategory(category: string): Promise<MedicalService[]> {
    const { data, error } = await supabase
      .from('medical_services')
      .select('*')
      .eq('category', category)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('service_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getProviderServicePricing(providerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('provider_services')
      .select(`
        *,
        service:service_id(*)
      `)
      .eq('provider_id', providerId);

    if (error) throw error;
    return data || [];
  }

  async setProviderServicePricing(pricing: Omit<ProviderServicePricing, 'id' | 'created_at' | 'updated_at'>): Promise<ProviderServicePricing> {
    const { data, error } = await supabase
      .from('provider_services')
      .upsert(pricing)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeProviderService(providerId: string, serviceId: string): Promise<void> {
    const { error } = await supabase
      .from('provider_services')
      .delete()
      .eq('provider_id', providerId)
      .eq('service_id', serviceId);

    if (error) throw error;
  }

  async bulkSetProviderServices(providerId: string, services: { service_id: string; base_price: number }[]): Promise<void> {
    const records = services.map(s => ({
      provider_id: providerId,
      service_id: s.service_id,
      base_price: s.base_price,
    }));

    const { error } = await supabase
      .from('provider_services')
      .upsert(records);

    if (error) throw error;
  }

  async searchServices(searchTerm: string): Promise<MedicalService[]> {
    return await adminCRUDService.search(
      'medical_services',
      searchTerm,
      ['service_name', 'service_code', 'description', 'category']
    );
  }

  async exportServices(): Promise<Blob> {
    return await adminCRUDService.exportToCSV('medical_services');
  }

  async getProvidersOfferingService(
    serviceId: string,
    options: {
      latitude?: number;
      longitude?: number;
      maxDistance?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    const { latitude, longitude, maxDistance = 50, limit = 20 } = options;

    // First, get providers who offer this service
    const { data: providerServices, error: psError } = await supabase
      .from('provider_services')
      .select(`
        provider_id,
        base_price,
        duration_minutes,
        virtual_available,
        in_person_available
      `)
      .eq('medical_service_id', serviceId);

    if (psError) throw psError;

    if (!providerServices || providerServices.length === 0) {
      return [];
    }

    const providerIds = providerServices.map((ps: any) => ps.provider_id);

    // Get full provider details
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select(`
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
      `)
      .in('id', providerIds)
      .eq('accepts_new_patients', true);

    if (providersError) throw providersError;

    if (!providers) return [];

    // Calculate distances if location provided and merge with service data
    const providersWithDetails = providers.map((provider: any) => {
      const providerServiceData = providerServices.filter(
        (ps: any) => ps.provider_id === provider.id
      );

      let distance: number | undefined;
      if (latitude && longitude && provider.latitude && provider.longitude) {
        distance = this.calculateDistance(
          latitude,
          longitude,
          provider.latitude,
          provider.longitude
        );
      }

      return {
        ...provider,
        provider_services: providerServiceData,
        distance,
      };
    });

    // Filter by distance if specified
    let filteredProviders = providersWithDetails;
    if (latitude && longitude) {
      filteredProviders = providersWithDetails.filter(
        (p: any) => p.distance === undefined || p.distance <= maxDistance
      );
    }

    // Sort by distance (closest first) or rating
    filteredProviders.sort((a: any, b: any) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    return filteredProviders.slice(0, limit);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
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

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('medical_services')
      .select('category')
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set(data?.map((item: any) => item.category) || [])];
    return categories.sort();
  }
}

export const medicalServicesService = new MedicalServicesService();
