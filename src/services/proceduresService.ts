import { supabase } from '../lib/supabase';

export interface Procedure {
  id: string;
  name: string;
  slug: string;
  cpt_code?: string;
  description: string;
  long_description?: string;
  category?: string;
  specialty_id?: string;
  preparation_info?: string;
  recovery_info?: string;
  average_duration_minutes?: number;
  what_to_expect?: string;
  typical_cost_min?: number;
  typical_cost_max?: number;
  related_procedures_ids?: string[];
  faq_data?: any;
  seo_title?: string;
  seo_description?: string;
  is_active: boolean;
  is_common: boolean;
  display_order: number;
  created_at: string;
}

export const proceduresService = {
  async getAllProcedures(includeUncommon = false) {
    let query = supabase
      .from('procedures_master')
      .select('*')
      .eq('is_active', true);

    if (!includeUncommon) {
      query = query.eq('is_common', true);
    }

    query = query.order('display_order', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getProcedureBySlug(slug: string) {
    const { data, error } = await supabase
      .from('procedures_master')
      .select(`
        *,
        specialties_master (
          id,
          name,
          slug
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProvidersByProcedure(procedureId: string, userLocation?: { latitude: number; longitude: number }) {
    const { data, error } = await supabase
      .from('provider_procedures')
      .select(`
        *,
        providers!inner (
          *,
          user_profiles!providers_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          provider_locations (
            *
          )
        )
      `)
      .eq('procedure_id', procedureId)
      .eq('providers.is_active', true);

    if (error) throw error;

    let providers = data || [];

    if (userLocation && providers.length > 0) {
      providers = providers.map((pp: any) => {
        const location = pp.providers?.provider_locations?.[0];
        if (location && location.latitude && location.longitude) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            location.latitude,
            location.longitude
          );
          return {
            ...pp,
            distance,
          };
        }
        return { ...pp, distance: null };
      });

      providers.sort((a: any, b: any) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return providers;
  },

  async searchProcedures(searchTerm: string) {
    const { data, error } = await supabase
      .from('procedures_master')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,cpt_code.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async getProceduresByCategory(category: string) {
    const { data, error } = await supabase
      .from('procedures_master')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
