import { supabase } from '../lib/supabase';

export interface Specialty {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  icon?: string;
  category?: string;
  common_conditions?: string[];
  seo_title?: string;
  seo_description?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const specialtiesService = {
  async getAllSpecialties() {
    const { data, error } = await supabase
      .from('specialties_master')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getSpecialtyBySlug(slug: string) {
    const { data, error } = await supabase
      .from('specialties_master')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProvidersBySpecialty(specialtyName: string) {
    const { data, error } = await supabase
      .from('providers')
      .select(`
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
        ),
        provider_reviews (
          rating,
          review_text
        )
      `)
      .eq('specialty', specialtyName)
      .eq('is_active', true)
      .order('rating_average', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getLocationsBySpecialty(specialtyName: string) {
    const { data, error } = await supabase
      .from('provider_locations')
      .select(`
        *,
        providers!inner (
          id,
          specialty,
          is_active,
          user_profiles!providers_user_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .eq('providers.specialty', specialtyName)
      .eq('providers.is_active', true);

    if (error) throw error;
    return data || [];
  },

  async getInsurancesBySpecialty(specialtyName: string) {
    const { data, error } = await supabase
      .from('provider_insurances')
      .select(`
        insurance_provider,
        insurance_plan_name,
        providers!inner (
          id,
          specialty,
          is_active
        )
      `)
      .eq('providers.specialty', specialtyName)
      .eq('providers.is_active', true)
      .eq('is_active', true);

    if (error) throw error;

    const uniqueInsurances = Array.from(
      new Set(data?.map((item) => item.insurance_provider))
    );

    return uniqueInsurances || [];
  },
};
