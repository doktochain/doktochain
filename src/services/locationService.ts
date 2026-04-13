import { supabase } from '../lib/supabase';
import { adminCRUDService } from './adminCRUDService';

export interface ClinicLocation {
  id?: string;
  location_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  phone?: string;
  email?: string;
  operating_hours?: any;
  is_active?: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

class LocationService {
  async getAllLocations(includeInactive: boolean = false): Promise<ClinicLocation[]> {
    let query = supabase
      .from('clinic_locations')
      .select('*')
      .is('deleted_at', null)
      .order('location_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getLocationById(id: string): Promise<ClinicLocation> {
    return await adminCRUDService.getById('clinic_locations', id);
  }

  async createLocation(location: Omit<ClinicLocation, 'id' | 'created_at' | 'updated_at'>): Promise<ClinicLocation> {
    const { data: user } = await supabase.auth.getUser();

    return await adminCRUDService.create('clinic_locations', {
      ...location,
      created_by: user.user?.id,
    });
  }

  async updateLocation(id: string, updates: Partial<ClinicLocation>): Promise<ClinicLocation> {
    const currentData = await this.getLocationById(id);
    return await adminCRUDService.update('clinic_locations', id, updates, currentData);
  }

  async deleteLocation(id: string, reason?: string): Promise<void> {
    await adminCRUDService.softDelete('clinic_locations', id, reason);
  }

  async restoreLocation(id: string): Promise<ClinicLocation> {
    return await adminCRUDService.restore('clinic_locations', id);
  }

  async toggleLocationStatus(id: string, isActive: boolean): Promise<void> {
    const currentData = await this.getLocationById(id);
    await adminCRUDService.update('clinic_locations', id, { is_active: isActive }, currentData);
  }

  async assignProviderToLocation(providerId: string, locationId: string, isPrimary: boolean = false): Promise<void> {
    const { error } = await supabase
      .from('provider_locations')
      .insert({
        provider_id: providerId,
        location_id: locationId,
        is_primary: isPrimary,
      });

    if (error) throw error;
  }

  async removeProviderFromLocation(providerId: string, locationId: string): Promise<void> {
    const { error} = await supabase
      .from('provider_locations')
      .delete()
      .eq('provider_id', providerId)
      .eq('location_id', locationId);

    if (error) throw error;
  }

  async getLocationProviders(locationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('provider_locations')
      .select(`
        *,
        provider:provider_id(
          id,
          first_name,
          last_name,
          specialization,
          user_profiles(email, phone)
        )
      `)
      .eq('location_id', locationId);

    if (error) throw error;
    return data || [];
  }

  async getProviderLocations(providerId: string): Promise<ClinicLocation[]> {
    const { data, error } = await supabase
      .from('provider_locations')
      .select(`
        location:location_id(*)
      `)
      .eq('provider_id', providerId);

    if (error) throw error;
    return data?.map(item => item.location).filter(Boolean) || [];
  }

  async searchLocations(searchTerm: string): Promise<ClinicLocation[]> {
    return await adminCRUDService.search(
      'clinic_locations',
      searchTerm,
      ['location_name', 'city', 'province', 'postal_code']
    );
  }

  async exportLocations(): Promise<Blob> {
    return await adminCRUDService.exportToCSV('clinic_locations');
  }
}

export const locationService = new LocationService();
