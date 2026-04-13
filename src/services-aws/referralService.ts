import { api } from '../lib/api-client';

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

export const referralService = {
  async createReferral(data: CreateReferralData): Promise<Referral> {
    const { data: referral, error } = await api.post<Referral>('/referrals', {
      ...data,
      status: 'pending',
    });

    if (error) throw error;
    return referral!;
  },

  async getSentReferrals(providerId: string): Promise<Referral[]> {
    const { data, error } = await api.get<Referral[]>('/referrals', {
      params: { referring_provider_id: providerId, order: 'created_at.desc' }
    });

    if (error) throw error;
    return data || [];
  },

  async getReceivedReferrals(providerId: string): Promise<Referral[]> {
    const { data, error } = await api.get<Referral[]>('/referrals', {
      params: { receiving_provider_id: providerId, order: 'created_at.desc' }
    });

    if (error) throw error;
    return data || [];
  },

  async getPatientReferrals(patientId: string): Promise<Referral[]> {
    const { data, error } = await api.get<Referral[]>('/referrals', {
      params: { patient_id: patientId, order: 'created_at.desc' }
    });

    if (error) throw error;
    return data || [];
  },

  async acceptReferral(referralId: string): Promise<void> {
    const { error } = await api.put(`/referrals/${referralId}`, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async declineReferral(referralId: string, reason?: string): Promise<void> {
    const { error } = await api.put(`/referrals/${referralId}`, {
      status: 'declined',
      notes: reason || null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async completeReferral(referralId: string): Promise<void> {
    const { error } = await api.put(`/referrals/${referralId}`, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async cancelReferral(referralId: string): Promise<void> {
    const { error } = await api.put(`/referrals/${referralId}`, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async linkAppointment(referralId: string, appointmentId: string): Promise<void> {
    const { error } = await api.put(`/referrals/${referralId}`, {
      status: 'scheduled',
      appointment_id: appointmentId,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async searchProviders(query: string, specialty?: string): Promise<any[]> {
    const params: Record<string, any> = { is_verified: true, limit: 20 };
    if (specialty) {
      params.specialty = specialty;
    }
    if (query) {
      params.search = query;
    }

    const { data, error } = await api.get<any[]>('/providers', { params });
    if (error) throw error;
    return data || [];
  },
};
