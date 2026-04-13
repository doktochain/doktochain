import { supabase } from '../lib/supabase';

export interface Clinic {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string | null;
  description: string;
  logo_url: string | null;
  phone: string;
  email: string;
  website: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  operating_hours: Record<string, any>;
  specialties: string[];
  is_active: boolean;
  is_verified: boolean;
  verification_date: string | null;
  onboarding_status: string;
  subscription_plan: string;
  max_providers: number;
  billing_model: string;
  platform_fee_percentage: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ClinicAffiliation {
  id: string;
  provider_id: string;
  clinic_entity_id: string | null;
  clinic_name: string;
  clinic_id: string | null;
  role_at_clinic: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  requested_at: string;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  providers?: {
    id: string;
    specialty: string;
    professional_title: string;
    is_verified: boolean;
    user_profiles?: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  };
}

export interface ClinicScheduleEntry {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_available: boolean;
  effective_from: string | null;
  effective_until: string | null;
  providers?: {
    specialty: string;
    user_profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface ClinicMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  message_text: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  conversation_id: string | null;
  sender_profile?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  recipient_profile?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface ClinicNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  action_label: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface ClinicInvitation {
  id: string;
  clinic_id: string;
  invited_by: string;
  email: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  role_at_clinic: string;
  message: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationData {
  clinic_id: string;
  invited_by: string;
  email: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  role_at_clinic?: string;
  message?: string;
}

export const clinicService = {
  async getAllClinics(): Promise<Clinic[]> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*, user_profiles!clinics_owner_id_fkey(first_name, last_name, email)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getClinicById(id: string): Promise<Clinic | null> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*, user_profiles!clinics_owner_id_fkey(first_name, last_name, email)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getClinicByOwnerId(ownerId: string): Promise<Clinic | null> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*, user_profiles!clinics_owner_id_fkey(first_name, last_name, email)')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createClinic(clinicData: Partial<Clinic>): Promise<Clinic> {
    const { data, error } = await supabase
      .from('clinics')
      .insert(clinicData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClinic(id: string, updates: Partial<Clinic>): Promise<Clinic> {
    const { data, error } = await supabase
      .from('clinics')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async softDeleteClinic(id: string): Promise<void> {
    const { error } = await supabase
      .from('clinics')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async verifyClinic(id: string): Promise<void> {
    const { error } = await supabase
      .from('clinics')
      .update({
        is_verified: true,
        verification_date: new Date().toISOString(),
        onboarding_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async getClinicAffiliations(clinicId: string): Promise<ClinicAffiliation[]> {
    const { data, error } = await supabase
      .from('provider_clinic_affiliations')
      .select(`
        *,
        providers(
          id,
          specialty,
          professional_title,
          is_verified,
          user_profiles!providers_user_id_fkey(first_name, last_name, email, phone)
        )
      `)
      .eq('clinic_entity_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateAffiliation(id: string, updates: Partial<ClinicAffiliation>): Promise<void> {
    const { error } = await supabase
      .from('provider_clinic_affiliations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async approveAffiliation(id: string): Promise<void> {
    const { error } = await supabase
      .from('provider_clinic_affiliations')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async rejectAffiliation(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('provider_clinic_affiliations')
      .update({
        status: 'rejected',
        notes: reason || 'Affiliation request rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async removeAffiliation(id: string): Promise<void> {
    const { error } = await supabase
      .from('provider_clinic_affiliations')
      .update({
        status: 'inactive',
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async getClinicProviderSchedules(clinicId: string): Promise<ClinicScheduleEntry[]> {
    const affiliations = await this.getClinicAffiliations(clinicId);
    const activeProviderIds = affiliations
      .filter(a => a.status === 'active')
      .map(a => a.provider_id);

    if (activeProviderIds.length === 0) return [];

    const { data, error } = await supabase
      .from('provider_schedules')
      .select(`
        *,
        providers!provider_schedules_provider_id_fkey(
          specialty,
          user_profiles!providers_user_id_fkey(first_name, last_name)
        )
      `)
      .in('provider_id', activeProviderIds)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateOperatingHours(clinicId: string, hours: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('clinics')
      .update({ operating_hours: hours, updated_at: new Date().toISOString() })
      .eq('id', clinicId);
    if (error) throw error;
  },

  async getClinicMessages(userId: string): Promise<ClinicMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender_profile:user_profiles!messages_sender_id_fkey(first_name, last_name, role),
        recipient_profile:user_profiles!messages_recipient_id_fkey(first_name, last_name, role)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  async sendMessage(senderId: string, recipientId: string, subject: string, text: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        subject,
        message_text: text,
      });
    if (error) throw error;
  },

  async markMessageRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw error;
  },

  async getClinicNotifications(userId: string): Promise<ClinicNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) throw error;
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  },

  async archiveNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) throw error;
  },

  async getClinicStats(clinicId: string) {
    const affiliations = await this.getClinicAffiliations(clinicId);
    const activeProviders = affiliations.filter(a => a.status === 'active').length;
    const pendingProviders = affiliations.filter(a => a.status === 'pending').length;

    return {
      totalProviders: affiliations.length,
      activeProviders,
      pendingProviders,
    };
  },

  async getClinicAppointments(providerIds: string[], filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    if (providerIds.length === 0) return [];
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients!appointments_patient_id_fkey(
          id,
          user_profiles!patients_user_id_fkey(first_name, last_name, email, phone, avatar_url)
        ),
        providers!appointments_provider_id_fkey(
          id,
          specialty,
          user_profiles!providers_user_id_fkey(first_name, last_name)
        )
      `)
      .in('provider_id', providerIds)
      .is('deleted_at', null)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dateFrom) query = query.gte('appointment_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('appointment_date', filters.dateTo);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getClinicTodayAppointments(providerIds: string[]) {
    const today = new Date().toISOString().split('T')[0];
    return this.getClinicAppointments(providerIds, { dateFrom: today, dateTo: today });
  },

  async getClinicUpcomingAppointments(providerIds: string[]) {
    const today = new Date().toISOString().split('T')[0];
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return this.getClinicAppointments(providerIds, { dateFrom: today, dateTo: weekLater });
  },

  async updateAppointmentStatus(appointmentId: string, status: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appointmentId);
    if (error) throw error;
  },

  async getClinicInvitations(clinicId: string): Promise<ClinicInvitation[]> {
    const { data, error } = await supabase
      .from('clinic_provider_invitations')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createInvitation(invData: CreateInvitationData): Promise<ClinicInvitation> {
    const { data, error } = await supabase
      .from('clinic_provider_invitations')
      .insert({
        clinic_id: invData.clinic_id,
        invited_by: invData.invited_by,
        email: invData.email.toLowerCase().trim(),
        first_name: invData.first_name.trim(),
        last_name: invData.last_name.trim(),
        specialty: invData.specialty || null,
        role_at_clinic: invData.role_at_clinic || 'attending_physician',
        message: invData.message || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('clinic_provider_invitations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (error) throw error;
  },

  async resendInvitation(invitationId: string): Promise<ClinicInvitation> {
    const { data, error } = await supabase
      .from('clinic_provider_invitations')
      .update({
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async acceptInvitation(token: string, providerId: string): Promise<void> {
    const { data: invitation, error: fetchError } = await supabase
      .from('clinic_provider_invitations')
      .select('*, clinics(name)')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!invitation) throw new Error('Invitation not found or already used');
    if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation has expired');

    const clinicName = invitation.clinics?.name || '';

    const { error: affError } = await supabase
      .from('provider_clinic_affiliations')
      .insert({
        provider_id: providerId,
        clinic_entity_id: invitation.clinic_id,
        clinic_name: clinicName,
        role_at_clinic: invitation.role_at_clinic,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        approved_at: new Date().toISOString(),
      });

    if (affError) throw affError;

    const { error: updateError } = await supabase
      .from('clinic_provider_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        provider_id: providerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;
  },

  async declineInvitation(token: string): Promise<void> {
    const { error } = await supabase
      .from('clinic_provider_invitations')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('token', token)
      .eq('status', 'pending');

    if (error) throw error;
  },

  async getInvitationByToken(token: string): Promise<ClinicInvitation | null> {
    const { data, error } = await supabase
      .from('clinic_provider_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async sendInvitationEmail(invitationId: string): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-clinic-invitation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invitation_id: invitationId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to send invitation email' }));
      throw new Error(err.error || 'Failed to send invitation email');
    }
  },

  async getProviderAffiliations(providerId: string): Promise<ClinicAffiliation[]> {
    const { data, error } = await supabase
      .from('provider_clinic_affiliations')
      .select(`
        *,
        clinics:clinic_entity_id(id, name, city, province, address_line1, phone, logo_url, is_verified)
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async requestAffiliation(providerId: string, clinicEntityId: string, roleAtClinic: string, notes?: string): Promise<void> {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name')
      .eq('id', clinicEntityId)
      .maybeSingle();

    const { error } = await supabase
      .from('provider_clinic_affiliations')
      .insert({
        provider_id: providerId,
        clinic_entity_id: clinicEntityId,
        clinic_name: clinic?.name || '',
        role_at_clinic: roleAtClinic,
        status: 'pending',
        notes,
      });

    if (error) throw error;
  },

  async getAvailableClinics(): Promise<Clinic[]> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
