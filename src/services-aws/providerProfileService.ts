import { api } from '../lib/api-client';
import { storageClient } from '../lib/storage-client';

export interface ProviderProfileData {
  bio?: string;
  years_of_experience?: number;
  professional_photo_url?: string;
  video_intro_url?: string;
  accepting_new_patients?: boolean;
  consultation_fee_cents?: number;
  virtual_consultation_fee_cents?: number;
  slot_duration_minutes?: number;
  max_daily_virtual_appointments?: number;
  emergency_consultation_available?: boolean;
  buffer_time_minutes?: number;
}

export interface Specialty {
  id: string;
  specialty_id: string;
  specialty_name?: string;
  is_primary: boolean;
  board_certified: boolean;
  certification_year?: number;
  certification_body?: string;
  special_interests?: string[];
}

export interface Procedure {
  id?: string;
  procedure_name: string;
  description?: string;
  price_cents?: number;
  duration_minutes?: number;
  requires_referral: boolean;
  available_virtually: boolean;
}

export interface Language {
  id?: string;
  language: string;
  proficiency: 'fluent' | 'conversational' | 'basic';
}

export interface TimeBlock {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: 'available' | 'break' | 'administrative';
  appointment_type: 'in-person' | 'virtual' | 'both';
  location_id?: string;
}

export interface InsurancePlan {
  id?: string;
  insurance_provider_id: string;
  insurance_provider_name?: string;
  direct_billing_enabled: boolean;
  coverage_limitations?: string;
  notes?: string;
}

export interface BillingIntegration {
  id?: string;
  integration_type: 'claimsecure' | 'telus_health' | 'hcai' | 'wcb';
  credentials: Record<string, any>;
  is_active: boolean;
}

export interface ProviderCredential {
  id: string;
  provider_id: string;
  credential_type: string;
  credential_name: string;
  issuing_organization: string;
  issue_date?: string;
  expiry_date?: string;
  credential_number?: string;
  document_url?: string;
  is_verified: boolean;
  created_at: string;
}

export const providerProfileService = {
  async updateProfile(_providerId: string, profileData: ProviderProfileData) {
    const { data, error } = await api.put<any>('/providers/me', profileData);

    if (error) throw error;

    if (data && profileData.professional_photo_url) {
      try {
        await api.put(`/user-profiles/${data.user_id}`, {
          profile_photo_url: profileData.professional_photo_url,
        });
      } catch (err) {
        console.warn('Could not sync photo to user profile', err);
      }
    }

    return data;
  },

  async getProfile(providerId: string) {
    const { data, error } = await api.get<any>(`/providers/${providerId}`);

    if (error) throw error;
    return data;
  },

  async uploadPhoto(file: File): Promise<string> {
    const { publicUrl } = await storageClient.uploadFile('profile-photos', file);
    return publicUrl;
  },

  async uploadVideo(file: File): Promise<string> {
    const { publicUrl } = await storageClient.uploadFile('profile-photos', file);
    return publicUrl;
  },

  async getAllSpecialties() {
    const res = await api.get<any[]>('/specialties-master', {
      params: { is_active: true, order_by: 'name:asc' },
    });

    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }

    const pubRes = await api.get<any[]>('/public/specialties');
    if (!pubRes.error && Array.isArray(pubRes.data)) {
      return pubRes.data;
    }

    if (res.error) throw res.error;
    return [];
  },

  async getProviderSpecialties(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-specialties', {
      params: { provider_id: providerId, include: 'specialties_master' },
    });

    if (error) throw error;
    return data || [];
  },

  async addSpecialty(providerId: string, specialty: Omit<Specialty, 'id'>) {
    const { data, error } = await api.post<any>('/provider-specialties', {
      provider_id: providerId,
      ...specialty,
    });

    if (error) throw error;
    return data;
  },

  async updateSpecialty(specialtyId: string, specialty: Partial<Specialty>) {
    const { data, error } = await api.put<any>(`/provider-specialties/${specialtyId}`, specialty);

    if (error) throw error;
    return data;
  },

  async deleteSpecialty(specialtyId: string) {
    const { error } = await api.delete(`/provider-specialties/${specialtyId}`);

    if (error) throw error;
  },

  async getAllProcedures() {
    const res = await api.get<any[]>('/procedures-master', {
      params: { is_active: true, order_by: 'name:asc' },
    });

    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }

    const pubRes = await api.get<any[]>('/public/procedures', { params: { all: true } });
    if (!pubRes.error && Array.isArray(pubRes.data)) {
      return pubRes.data;
    }

    if (res.error) throw res.error;
    return [];
  },

  async getProcedures(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-procedures', {
      params: { provider_id: providerId, order_by: 'procedure_name:asc' },
    });

    if (error) throw error;
    return data || [];
  },

  async addProcedure(providerId: string, procedure: Procedure) {
    const { data, error } = await api.post<any>('/provider-procedures', {
      provider_id: providerId,
      ...procedure,
    });

    if (error) throw error;
    return data;
  },

  async updateProcedure(procedureId: string, procedure: Partial<Procedure>) {
    const { data, error } = await api.put<any>(`/provider-procedures/${procedureId}`, procedure);

    if (error) throw error;
    return data;
  },

  async deleteProcedure(procedureId: string) {
    const { error } = await api.delete(`/provider-procedures/${procedureId}`);

    if (error) throw error;
  },

  async getLanguages(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-languages', {
      params: { provider_id: providerId, order_by: 'language:asc' },
    });

    if (error) throw error;
    return data || [];
  },

  async addLanguage(providerId: string, language: Language) {
    const { data, error } = await api.post<any>('/provider-languages', {
      provider_id: providerId,
      ...language,
    });

    if (error) throw error;
    return data;
  },

  async updateLanguage(languageId: string, language: Partial<Language>) {
    const { data, error } = await api.put<any>(`/provider-languages/${languageId}`, language);

    if (error) throw error;
    return data;
  },

  async deleteLanguage(languageId: string) {
    const { error } = await api.delete(`/provider-languages/${languageId}`);

    if (error) throw error;
  },

  async getTimeBlocks(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-time-blocks', {
      params: { provider_id: providerId, order_by: 'day_of_week:asc,start_time:asc' },
    });

    if (error) throw error;
    return data || [];
  },

  async addTimeBlock(providerId: string, timeBlock: TimeBlock) {
    const { data, error } = await api.post<any>('/provider-time-blocks', {
      provider_id: providerId,
      ...timeBlock,
    });

    if (error) throw error;
    return data;
  },

  async updateTimeBlock(blockId: string, timeBlock: Partial<TimeBlock>) {
    const { data, error } = await api.put<any>(`/provider-time-blocks/${blockId}`, timeBlock);

    if (error) throw error;
    return data;
  },

  async deleteTimeBlock(blockId: string) {
    const { error } = await api.delete(`/provider-time-blocks/${blockId}`);

    if (error) throw error;
  },

  async getUnavailability(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-unavailability', {
      params: {
        provider_id: providerId,
        end_date_gte: new Date().toISOString().split('T')[0],
        order_by: 'start_date:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async addUnavailability(providerId: string, unavailability: any) {
    const { data, error } = await api.post<any>('/provider-unavailability', {
      provider_id: providerId,
      ...unavailability,
    });

    if (error) throw error;
    return data;
  },

  async deleteUnavailability(id: string) {
    const { error } = await api.delete(`/provider-unavailability/${id}`);

    if (error) throw error;
  },

  async getAllInsuranceProviders() {
    const { data, error } = await api.get<any[]>('/insurance-providers-master', {
      params: { is_active: true, order_by: 'name:asc' },
    });

    if (error) throw error;
    return data || [];
  },

  async getProviderInsurancePlans(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-insurance-plans', {
      params: { provider_id: providerId, include: 'insurance_providers_master' },
    });

    if (error) throw error;
    return data || [];
  },

  async addInsurancePlan(providerId: string, plan: Omit<InsurancePlan, 'id'>) {
    const { data, error } = await api.post<any>('/provider-insurance-plans', {
      provider_id: providerId,
      ...plan,
    });

    if (error) throw error;
    return data;
  },

  async updateInsurancePlan(planId: string, plan: Partial<InsurancePlan>) {
    const { data, error } = await api.put<any>(`/provider-insurance-plans/${planId}`, plan);

    if (error) throw error;
    return data;
  },

  async deleteInsurancePlan(planId: string) {
    const { error } = await api.delete(`/provider-insurance-plans/${planId}`);

    if (error) throw error;
  },

  async getBillingIntegrations(providerId: string) {
    const { data, error } = await api.get<any[]>('/provider-billing-integrations', {
      params: { provider_id: providerId },
    });

    if (error) throw error;
    return data || [];
  },

  async addBillingIntegration(providerId: string, integration: Omit<BillingIntegration, 'id'>) {
    const { data, error } = await api.post<any>('/provider-billing-integrations', {
      provider_id: providerId,
      ...integration,
    });

    if (error) throw error;
    return data;
  },

  async updateBillingIntegration(integrationId: string, integration: Partial<BillingIntegration>) {
    const { data, error } = await api.put<any>(`/provider-billing-integrations/${integrationId}`, integration);

    if (error) throw error;
    return data;
  },

  async deleteBillingIntegration(integrationId: string) {
    const { error } = await api.delete(`/provider-billing-integrations/${integrationId}`);

    if (error) throw error;
  },

  async getCredentials(providerId: string): Promise<ProviderCredential[]> {
    const { data, error } = await api.get<ProviderCredential[]>('/provider-credentials', {
      params: { provider_id: providerId, order_by: 'created_at:desc' },
    });

    if (error) throw error;
    return data || [];
  },

  async addCredential(providerId: string, credential: {
    credential_type: string;
    credential_name: string;
    issuing_organization: string;
    issue_date?: string;
    expiry_date?: string;
    credential_number?: string;
    document_url?: string;
  }): Promise<ProviderCredential> {
    const { data, error } = await api.post<ProviderCredential>('/provider-credentials', {
      provider_id: providerId,
      ...credential,
      is_verified: false,
    });

    if (error) throw error;
    return data!;
  },

  async updateCredential(credentialId: string, updates: Partial<ProviderCredential>): Promise<ProviderCredential> {
    const { data, error } = await api.put<ProviderCredential>(`/provider-credentials/${credentialId}`, updates);

    if (error) throw error;
    return data!;
  },

  async deleteCredential(credentialId: string) {
    const { error } = await api.delete(`/provider-credentials/${credentialId}`);

    if (error) throw error;
  },

  async uploadCredentialDocument(file: File): Promise<string> {
    const { publicUrl } = await storageClient.uploadFile('identity-documents', file);
    return publicUrl;
  },
};
