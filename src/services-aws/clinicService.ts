import { api } from '../lib/api-client';

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
    const { data, error } = await api.get<Clinic[]>('/clinics', {
      params: { deleted_at: 'null', order: 'created_at.desc', include: 'owner' },
    });

    if (error) throw error;
    return data || [];
  },

  async getClinicById(id: string): Promise<Clinic | null> {
    const { data, error } = await api.get<Clinic>(`/clinics/${id}`);

    if (error) throw error;
    return data;
  },

  async getClinicByOwnerId(ownerId: string): Promise<Clinic | null> {
    const { data, error } = await api.get<Clinic>('/clinics', {
      params: { owner_id: ownerId, deleted_at: 'null', single: true },
    });

    if (error) throw error;
    return data;
  },

  async createClinic(clinicData: Partial<Clinic>): Promise<Clinic> {
    const { data, error } = await api.post<Clinic>('/clinics', clinicData);

    if (error) throw error;
    return data!;
  },

  async updateClinic(id: string, updates: Partial<Clinic>): Promise<Clinic> {
    const { data, error } = await api.put<Clinic>(`/clinics/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async softDeleteClinic(id: string): Promise<void> {
    const { error } = await api.put(`/clinics/${id}`, {
      deleted_at: new Date().toISOString(),
      is_active: false,
    });

    if (error) throw error;
  },

  async verifyClinic(id: string): Promise<void> {
    const { error } = await api.put(`/clinics/${id}`, {
      is_verified: true,
      verification_date: new Date().toISOString(),
      onboarding_status: 'approved',
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async getClinicAffiliations(clinicId: string): Promise<ClinicAffiliation[]> {
    const { data, error } = await api.get<ClinicAffiliation[]>('/provider-clinic-affiliations', {
      params: { clinic_entity_id: clinicId, order: 'created_at.desc', include: 'providers' },
    });

    if (error) throw error;
    return data || [];
  },

  async updateAffiliation(id: string, updates: Partial<ClinicAffiliation>): Promise<void> {
    const { error } = await api.put(`/provider-clinic-affiliations/${id}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async approveAffiliation(id: string): Promise<void> {
    const { error } = await api.put(`/provider-clinic-affiliations/${id}`, {
      status: 'active',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async rejectAffiliation(id: string, reason?: string): Promise<void> {
    const { error } = await api.put(`/provider-clinic-affiliations/${id}`, {
      status: 'rejected',
      notes: reason || 'Affiliation request rejected',
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async removeAffiliation(id: string): Promise<void> {
    const { error } = await api.put(`/provider-clinic-affiliations/${id}`, {
      status: 'inactive',
      end_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async getClinicProviderSchedules(clinicId: string): Promise<ClinicScheduleEntry[]> {
    const affiliations = await this.getClinicAffiliations(clinicId);
    const activeProviderIds = affiliations
      .filter(a => a.status === 'active')
      .map(a => a.provider_id);

    if (activeProviderIds.length === 0) return [];

    const { data, error } = await api.get<ClinicScheduleEntry[]>('/provider-schedules', {
      params: {
        provider_id: activeProviderIds,
        order: 'day_of_week.asc,start_time.asc',
        include: 'providers',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async updateOperatingHours(clinicId: string, hours: Record<string, any>): Promise<void> {
    const { error } = await api.put(`/clinics/${clinicId}`, {
      operating_hours: hours,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async getClinicMessages(userId: string): Promise<ClinicMessage[]> {
    const { data, error } = await api.get<ClinicMessage[]>('/messages', {
      params: {
        participant_id: userId,
        order: 'created_at.desc',
        limit: 50,
      },
    });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(senderId: string, recipientId: string, subject: string, text: string): Promise<void> {
    const { error } = await api.post('/messages', {
      sender_id: senderId,
      recipient_id: recipientId,
      subject,
      message_text: text,
    });
    if (error) throw error;
  },

  async markMessageRead(messageId: string): Promise<void> {
    const { error } = await api.put(`/messages/${messageId}`, {
      is_read: true,
      read_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async getClinicNotifications(userId: string): Promise<ClinicNotification[]> {
    const { data, error } = await api.get<ClinicNotification[]>('/notifications', {
      params: {
        user_id: userId,
        is_archived: false,
        order: 'created_at.desc',
        limit: 50,
      },
    });

    if (error) throw error;
    return data || [];
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await api.put(`/notifications/${notificationId}`, {
      is_read: true,
      read_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await api.put('/notifications', {
      is_read: true,
      read_at: new Date().toISOString(),
      _filter: { user_id: userId, is_read: false },
    });
    if (error) throw error;
  },

  async archiveNotification(notificationId: string): Promise<void> {
    const { error } = await api.put(`/notifications/${notificationId}`, {
      is_archived: true,
      archived_at: new Date().toISOString(),
    });
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
    const params: any = {
      provider_id: providerIds,
      deleted_at: 'null',
      order: 'appointment_date.asc,start_time.asc',
      include: 'patients,providers',
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.dateFrom) params.date_from = filters.dateFrom;
    if (filters?.dateTo) params.date_to = filters.dateTo;

    const { data, error } = await api.get<any[]>('/appointments', { params });
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
    const { error } = await api.put(`/appointments/${appointmentId}`, {
      status,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async getClinicInvitations(clinicId: string): Promise<ClinicInvitation[]> {
    const { data, error } = await api.get<ClinicInvitation[]>('/clinic-provider-invitations', {
      params: { clinic_id: clinicId, order: 'created_at.desc' },
    });

    if (error) throw error;
    return data || [];
  },

  async createInvitation(invData: CreateInvitationData): Promise<ClinicInvitation> {
    const { data, error } = await api.post<ClinicInvitation>('/clinic-provider-invitations', {
      clinic_id: invData.clinic_id,
      invited_by: invData.invited_by,
      email: invData.email.toLowerCase().trim(),
      first_name: invData.first_name.trim(),
      last_name: invData.last_name.trim(),
      specialty: invData.specialty || null,
      role_at_clinic: invData.role_at_clinic || 'attending_physician',
      message: invData.message || null,
    });

    if (error) throw error;
    return data!;
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await api.put(`/clinic-provider-invitations/${invitationId}`, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async resendInvitation(invitationId: string): Promise<ClinicInvitation> {
    const { data, error } = await api.put<ClinicInvitation>(`/clinic-provider-invitations/${invitationId}`, {
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async acceptInvitation(token: string, providerId: string): Promise<void> {
    const { data: invitation, error: fetchError } = await api.get<any>('/clinic-provider-invitations', {
      params: { token, status: 'pending', single: true },
    });

    if (fetchError) throw fetchError;
    if (!invitation) throw new Error('Invitation not found or already used');
    if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation has expired');

    const clinicName = invitation.clinics?.name || '';

    const { error: affError } = await api.post('/provider-clinic-affiliations', {
      provider_id: providerId,
      clinic_entity_id: invitation.clinic_id,
      clinic_name: clinicName,
      role_at_clinic: invitation.role_at_clinic,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      approved_at: new Date().toISOString(),
    });

    if (affError) throw affError;

    const { error: updateError } = await api.put(`/clinic-provider-invitations/${invitation.id}`, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      provider_id: providerId,
      updated_at: new Date().toISOString(),
    });

    if (updateError) throw updateError;
  },

  async declineInvitation(token: string): Promise<void> {
    const { error } = await api.put('/clinic-provider-invitations', {
      status: 'declined',
      updated_at: new Date().toISOString(),
      _filter: { token, status: 'pending' },
    });

    if (error) throw error;
  },

  async getInvitationByToken(token: string): Promise<ClinicInvitation | null> {
    const { data, error } = await api.get<ClinicInvitation>('/clinic-provider-invitations', {
      params: { token, single: true },
    });

    if (error) throw error;
    return data;
  },

  async sendInvitationEmail(invitationId: string): Promise<void> {
    const { error } = await api.post('/send-clinic-invitation', {
      invitation_id: invitationId,
    });

    if (error) {
      throw new Error(error.error || 'Failed to send invitation email');
    }
  },

  async getProviderAffiliations(providerId: string): Promise<ClinicAffiliation[]> {
    const { data, error } = await api.get<ClinicAffiliation[]>('/provider-clinic-affiliations', {
      params: { provider_id: providerId, order: 'created_at.desc', include: 'clinics' },
    });

    if (error) throw error;
    return data || [];
  },

  async requestAffiliation(providerId: string, clinicEntityId: string, roleAtClinic: string, notes?: string): Promise<void> {
    const { data: clinic } = await api.get<any>(`/clinics/${clinicEntityId}`);

    const { error } = await api.post('/provider-clinic-affiliations', {
      provider_id: providerId,
      clinic_entity_id: clinicEntityId,
      clinic_name: clinic?.name || '',
      role_at_clinic: roleAtClinic,
      status: 'pending',
      notes,
    });

    if (error) throw error;
  },

  async getClinicPatientById(patientId: string): Promise<any> {
    const { data, error } = await api.get<any>(`/patients/${patientId}`, {
      params: { include: 'user_profiles' },
    });
    if (error) throw error;
    return data;
  },

  async getPatientActiveConsents(patientId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/patient-consents', {
      params: { patient_id: patientId, status: 'active' },
    });
    if (error) throw error;
    return data || [];
  },

  async getPatientAppointmentsByProviders(patientId: string, providerIds: string[]): Promise<any[]> {
    if (providerIds.length === 0) return [];
    const { data, error } = await api.get<any[]>('/appointments', {
      params: {
        patient_id: patientId,
        provider_id: providerIds,
        deleted_at: 'null',
        order: 'appointment_date.desc',
        include: 'providers',
      },
    });
    if (error) throw error;
    return data || [];
  },

  async getPatientTransactionsByProviders(userId: string, providerIds: string[]): Promise<any[]> {
    if (providerIds.length === 0) return [];
    const { data, error } = await api.get<any[]>('/provider-transactions', {
      params: {
        user_id: userId,
        provider_id: providerIds,
        order: 'created_at.desc',
      },
    });
    if (error) throw error;
    return data || [];
  },

  async getPatientLatestVitals(patientId: string): Promise<any> {
    const { data, error } = await api.get<any>('/vital-signs', {
      params: {
        patient_id: patientId,
        order: 'recorded_at.desc',
        limit: 1,
        single: true,
      },
    });
    if (error) throw error;
    return data;
  },

  async getMedicalServices(): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/medical-services', {
      params: { deleted_at: 'null', order: 'name' },
    });
    if (error) throw error;
    return data || [];
  },

  async getClinicServices(clinicId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/clinic-services', {
      params: { clinic_id: clinicId, order: 'created_at.desc', include: 'medical_services' },
    });
    if (error) throw error;
    return data || [];
  },

  async toggleClinicService(serviceId: string, isActive: boolean): Promise<void> {
    const { error } = await api.put(`/clinic-services/${serviceId}`, {
      is_active: isActive,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async activateClinicService(clinicId: string, serviceId: string, customPrice?: number): Promise<void> {
    const { error } = await api.post('/clinic-services', {
      clinic_id: clinicId,
      service_id: serviceId,
      is_active: true,
      custom_price: customPrice || null,
      _upsert: true,
      _onConflict: 'clinic_id,service_id',
    });
    if (error) throw error;
  },

  async updateClinicServicePrice(serviceId: string, customPrice: number | null): Promise<void> {
    const { error } = await api.put(`/clinic-services/${serviceId}`, {
      custom_price: customPrice,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async bulkActivateClinicServices(clinicId: string, serviceIds: string[]): Promise<void> {
    const records = serviceIds.map(serviceId => ({
      clinic_id: clinicId,
      service_id: serviceId,
      is_active: true,
    }));
    const { error } = await api.post('/clinic-services', {
      _bulk: records,
      _upsert: true,
      _onConflict: 'clinic_id,service_id',
    });
    if (error) throw error;
  },

  async getSpecialtiesMaster(): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/specialties-master', {
      params: { is_active: true, order: 'display_order.asc' },
    });
    if (error) throw error;
    return data || [];
  },

  async getClinicSpecializations(clinicId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/clinic-specializations', {
      params: { clinic_id: clinicId, order: 'created_at.desc', include: 'specialties_master' },
    });
    if (error) throw error;
    return data || [];
  },

  async toggleClinicSpecialization(specId: string, isActive: boolean): Promise<void> {
    const { error } = await api.put(`/clinic-specializations/${specId}`, {
      is_active: isActive,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async activateClinicSpecialization(clinicId: string, specialtyId: string): Promise<void> {
    const { error } = await api.post('/clinic-specializations', {
      clinic_id: clinicId,
      specialty_id: specialtyId,
      is_active: true,
      _upsert: true,
      _onConflict: 'clinic_id,specialty_id',
    });
    if (error) throw error;
  },

  async bulkActivateClinicSpecializations(clinicId: string, specialtyIds: string[]): Promise<void> {
    const records = specialtyIds.map(specialtyId => ({
      clinic_id: clinicId,
      specialty_id: specialtyId,
      is_active: true,
    }));
    const { error } = await api.post('/clinic-specializations', {
      _bulk: records,
      _upsert: true,
      _onConflict: 'clinic_id,specialty_id',
    });
    if (error) throw error;
  },

  async getClinicStaff(clinicId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/clinic-staff', {
      params: { clinic_id: clinicId, order: 'created_at.desc' },
    });
    if (error) throw error;
    return data || [];
  },

  async getStaffActivityLog(clinicId: string, limit: number = 100): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/clinic-staff-activity-log', {
      params: { clinic_id: clinicId, order: 'created_at.desc', limit, include: 'clinic_staff' },
    });
    if (error) throw error;
    return data || [];
  },

  async addStaffMember(staffData: any): Promise<any> {
    const { data, error } = await api.post<any>('/clinic-staff', staffData);
    if (error) throw error;
    return data;
  },

  async logStaffActivity(clinicId: string, staffId: string, action: string, details?: any): Promise<void> {
    const { error } = await api.post('/clinic-staff-activity-log', {
      clinic_id: clinicId,
      staff_id: staffId,
      action,
      details,
    });
    if (error) throw error;
  },

  async updateStaffStatus(staffId: string, status: string): Promise<void> {
    const { error } = await api.put(`/clinic-staff/${staffId}`, {
      status,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async toggleStaffDuty(staffId: string, isOnDuty: boolean, clinicId: string): Promise<void> {
    const { error } = await api.put(`/clinic-staff/${staffId}`, {
      is_on_duty: isOnDuty,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    try {
      await api.post('/clinic-staff-activity-log', {
        clinic_id: clinicId,
        staff_id: staffId,
        action: isOnDuty ? 'clock_in' : 'clock_out',
        details: { timestamp: new Date().toISOString() },
      });
    } catch {}
  },

  async getAvailableClinics(): Promise<Clinic[]> {
    const { data, error } = await api.get<Clinic[]>('/clinics', {
      params: { is_active: true, is_verified: true, order: 'name' },
    });

    if (error) throw error;
    return data || [];
  },
};
