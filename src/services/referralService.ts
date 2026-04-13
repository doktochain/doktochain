import { supabase } from '../lib/supabase';

export interface Referral {
  id: string;
  referring_provider_id: string;
  receiving_provider_id: string | null;
  patient_id: string;
  referral_reason: string;
  urgency: 'routine' | 'urgent' | 'emergent';
  preferred_location_id: string | null;
  status: string;
  clinical_note_id: string | null;
  external_provider_name: string | null;
  external_provider_specialty: string | null;
  external_provider_phone: string | null;
  external_provider_fax: string | null;
  external_provider_address: string | null;
  referral_letter_url: string | null;
  notes: string | null;
  appointment_id: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  referring_provider?: {
    id: string;
    specialty: string;
    professional_title: string;
    user_profiles?: { first_name: string; last_name: string };
  };
  receiving_provider?: {
    id: string;
    specialty: string;
    professional_title: string;
    user_profiles?: { first_name: string; last_name: string };
  };
  patients?: {
    id: string;
    user_profiles?: { first_name: string; last_name: string };
  };
  provider_locations?: {
    id: string;
    location_name: string;
    city: string;
    province: string;
  };
}

export interface CreateReferralData {
  referring_provider_id: string;
  receiving_provider_id?: string | null;
  patient_id: string;
  referral_reason: string;
  urgency: 'routine' | 'urgent' | 'emergent';
  preferred_location_id?: string | null;
  clinical_note_id?: string | null;
  external_provider_name?: string;
  external_provider_specialty?: string;
  external_provider_phone?: string;
  external_provider_fax?: string;
  external_provider_address?: string;
  notes?: string;
  expires_at?: string;
}

const REFERRAL_SELECT = `
  *,
  referring_provider:referring_provider_id(
    id, specialty, professional_title,
    user_profiles!providers_user_id_fkey(first_name, last_name)
  ),
  receiving_provider:receiving_provider_id(
    id, specialty, professional_title,
    user_profiles!providers_user_id_fkey(first_name, last_name)
  ),
  patients:patient_id(
    id,
    user_profiles!patients_user_id_fkey(first_name, last_name)
  ),
  provider_locations:preferred_location_id(
    id, location_name, city, province
  )
`;

export const referralService = {
  async createReferral(data: CreateReferralData): Promise<Referral> {
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        ...data,
        status: 'pending',
      })
      .select(REFERRAL_SELECT)
      .single();

    if (error) throw error;
    return referral;
  },

  async getSentReferrals(providerId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(REFERRAL_SELECT)
      .eq('referring_provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getReceivedReferrals(providerId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(REFERRAL_SELECT)
      .eq('receiving_provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPatientReferrals(patientId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(REFERRAL_SELECT)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async acceptReferral(referralId: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (error) throw error;
  },

  async declineReferral(referralId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'declined',
        notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (error) throw error;
  },

  async completeReferral(referralId: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (error) throw error;
  },

  async cancelReferral(referralId: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (error) throw error;
  },

  async linkAppointment(referralId: string, appointmentId: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'scheduled',
        appointment_id: appointmentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (error) throw error;
  },

  async searchProviders(query: string, specialty?: string): Promise<any[]> {
    let q = supabase
      .from('providers')
      .select(`
        id, specialty, professional_title, is_verified,
        user_profiles!providers_user_id_fkey(first_name, last_name),
        provider_locations(id, location_name, city, province)
      `)
      .eq('is_verified', true)
      .limit(20);

    if (specialty) {
      q = q.ilike('specialty', `%${specialty}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
};
