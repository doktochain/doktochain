import { supabase } from '../lib/supabase';

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
  async updateProfile(providerId: string, profileData: ProviderProfileData) {
    const { data, error } = await supabase
      .from('providers')
      .update(profileData)
      .eq('id', providerId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (data && profileData.professional_photo_url) {
      await supabase
        .from('user_profiles')
        .update({ profile_photo_url: profileData.professional_photo_url })
        .eq('id', data.user_id);
    }

    return data;
  },

  async getProfile(providerId: string) {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async uploadPhoto(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `provider-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('user-uploads').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async uploadVideo(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `provider-videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('user-uploads').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async getAllSpecialties() {
    const { data, error } = await supabase
      .from('specialties_master')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getProviderSpecialties(providerId: string) {
    const { data, error } = await supabase
      .from('provider_specialties')
      .select('*, specialties_master(name)')
      .eq('provider_id', providerId);

    if (error) throw error;
    return data || [];
  },

  async addSpecialty(providerId: string, specialty: Omit<Specialty, 'id'>) {
    const { data, error } = await supabase
      .from('provider_specialties')
      .insert({
        provider_id: providerId,
        ...specialty,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSpecialty(specialtyId: string, specialty: Partial<Specialty>) {
    const { data, error } = await supabase
      .from('provider_specialties')
      .update(specialty)
      .eq('id', specialtyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSpecialty(specialtyId: string) {
    const { error } = await supabase
      .from('provider_specialties')
      .delete()
      .eq('id', specialtyId);

    if (error) throw error;
  },

  async getAllProcedures() {
    const { data, error } = await supabase
      .from('procedures_master')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getProcedures(providerId: string) {
    const { data, error } = await supabase
      .from('provider_procedures')
      .select('*')
      .eq('provider_id', providerId)
      .order('procedure_name');

    if (error) throw error;
    return data || [];
  },

  async addProcedure(providerId: string, procedure: Procedure) {
    const { data, error } = await supabase
      .from('provider_procedures')
      .insert({
        provider_id: providerId,
        ...procedure,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProcedure(procedureId: string, procedure: Partial<Procedure>) {
    const { data, error } = await supabase
      .from('provider_procedures')
      .update(procedure)
      .eq('id', procedureId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProcedure(procedureId: string) {
    const { error } = await supabase
      .from('provider_procedures')
      .delete()
      .eq('id', procedureId);

    if (error) throw error;
  },

  async getLanguages(providerId: string) {
    const { data, error } = await supabase
      .from('provider_languages')
      .select('*')
      .eq('provider_id', providerId)
      .order('language');

    if (error) throw error;
    return data || [];
  },

  async addLanguage(providerId: string, language: Language) {
    const { data, error } = await supabase
      .from('provider_languages')
      .insert({
        provider_id: providerId,
        ...language,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLanguage(languageId: string, language: Partial<Language>) {
    const { data, error } = await supabase
      .from('provider_languages')
      .update(language)
      .eq('id', languageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteLanguage(languageId: string) {
    const { error} = await supabase
      .from('provider_languages')
      .delete()
      .eq('id', languageId);

    if (error) throw error;
  },

  async getTimeBlocks(providerId: string) {
    const { data, error } = await supabase
      .from('provider_time_blocks')
      .select('*')
      .eq('provider_id', providerId)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    return data || [];
  },

  async addTimeBlock(providerId: string, timeBlock: TimeBlock) {
    const { data, error } = await supabase
      .from('provider_time_blocks')
      .insert({
        provider_id: providerId,
        ...timeBlock,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTimeBlock(blockId: string, timeBlock: Partial<TimeBlock>) {
    const { data, error } = await supabase
      .from('provider_time_blocks')
      .update(timeBlock)
      .eq('id', blockId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTimeBlock(blockId: string) {
    const { error } = await supabase
      .from('provider_time_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;
  },

  async getUnavailability(providerId: string) {
    const { data, error } = await supabase
      .from('provider_unavailability')
      .select('*')
      .eq('provider_id', providerId)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date');

    if (error) throw error;
    return data || [];
  },

  async addUnavailability(providerId: string, unavailability: any) {
    const { data, error } = await supabase
      .from('provider_unavailability')
      .insert({
        provider_id: providerId,
        ...unavailability,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUnavailability(id: string) {
    const { error } = await supabase
      .from('provider_unavailability')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAllInsuranceProviders() {
    const { data, error } = await supabase
      .from('insurance_providers_master')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getProviderInsurancePlans(providerId: string) {
    const { data, error } = await supabase
      .from('provider_insurance_plans')
      .select('*, insurance_providers_master(id, name, logo_url, provider_type)')
      .eq('provider_id', providerId);

    if (error) throw error;
    return data || [];
  },

  async addInsurancePlan(providerId: string, plan: Omit<InsurancePlan, 'id'>) {
    const { data, error } = await supabase
      .from('provider_insurance_plans')
      .insert({
        provider_id: providerId,
        ...plan,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateInsurancePlan(planId: string, plan: Partial<InsurancePlan>) {
    const { data, error } = await supabase
      .from('provider_insurance_plans')
      .update(plan)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteInsurancePlan(planId: string) {
    const { error } = await supabase
      .from('provider_insurance_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },

  async getBillingIntegrations(providerId: string) {
    const { data, error } = await supabase
      .from('provider_billing_integrations')
      .select('*')
      .eq('provider_id', providerId);

    if (error) throw error;
    return data || [];
  },

  async addBillingIntegration(providerId: string, integration: Omit<BillingIntegration, 'id'>) {
    const { data, error } = await supabase
      .from('provider_billing_integrations')
      .insert({
        provider_id: providerId,
        ...integration,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBillingIntegration(integrationId: string, integration: Partial<BillingIntegration>) {
    const { data, error } = await supabase
      .from('provider_billing_integrations')
      .update(integration)
      .eq('id', integrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteBillingIntegration(integrationId: string) {
    const { error } = await supabase
      .from('provider_billing_integrations')
      .delete()
      .eq('id', integrationId);

    if (error) throw error;
  },

  async getCredentials(providerId: string): Promise<ProviderCredential[]> {
    const { data, error } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

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
    const { data, error } = await supabase
      .from('provider_credentials')
      .insert({
        provider_id: providerId,
        ...credential,
        is_verified: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCredential(credentialId: string, updates: Partial<ProviderCredential>): Promise<ProviderCredential> {
    const { data, error } = await supabase
      .from('provider_credentials')
      .update(updates)
      .eq('id', credentialId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCredential(credentialId: string) {
    const { error } = await supabase
      .from('provider_credentials')
      .delete()
      .eq('id', credentialId);

    if (error) throw error;
  },

  async uploadCredentialDocument(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `provider-credentials/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('user-uploads').getPublicUrl(filePath);
    return data.publicUrl;
  },
};
