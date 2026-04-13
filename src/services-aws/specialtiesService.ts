import { api } from '../lib/api-client';

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
    const { data, error } = await api.get<any[]>('/public/specialties');
    if (error) throw new Error(error.message);
    return (data || []).filter((s: any) => s.is_active !== false)
      .sort((a: any, b: any) => (a.display_order || 999) - (b.display_order || 999));
  },

  async getSpecialtyBySlug(slug: string) {
    const data = await this.getAllSpecialties();
    return data.find((s: any) => s.slug === slug) || null;
  },

  async getProvidersBySpecialty(specialtyName: string) {
    const { data, error } = await api.get<any[]>(`/providers/by-specialty/${encodeURIComponent(specialtyName)}`);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getLocationsBySpecialty(specialtyName: string) {
    const providers = await this.getProvidersBySpecialty(specialtyName);
    return providers.flatMap((p: any) => p.locations || []);
  },

  async getInsurancesBySpecialty(_specialtyName: string) {
    return [];
  },
};
