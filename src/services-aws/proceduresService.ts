import { adminCRUDService } from './adminCRUDService';
import { api } from '../lib/api-client';

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
    const params = includeUncommon ? '?all=true' : '';
    const { data, error } = await api.get<any[]>(`/public/procedures${params}`);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getProcedureBySlug(slug: string) {
    const data = await adminCRUDService.getAll('procedures_master', false);
    return data.find((p: any) => p.slug === slug && p.is_active !== false) || null;
  },

  async getProvidersByProcedure(procedureId: string, _userLocation?: any) {
    const { data, error } = await api.get<any[]>(`/providers/by-procedure/${procedureId}`);
    if (error) throw new Error(error.message);
    return data || [];
  },
  
  async searchProcedures(searchTerm: string) {
    return adminCRUDService.search('procedures_master', searchTerm, ['name', 'description', 'cpt_code', 'category']);
  },
  
  async getProceduresByCategory(category: string) {
    const data = await adminCRUDService.getAll('procedures_master', false);
    return data.filter((p: any) => p.category === category && p.is_active !== false)
      .sort((a: any, b: any) => (a.display_order || 999) - (b.display_order || 999));
  },
};
