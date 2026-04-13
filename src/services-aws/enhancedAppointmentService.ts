import { api } from '../lib/api-client';
import { appointmentService, Appointment } from './appointmentService';
import { auditLog } from './auditLogger';

export interface AppointmentType {
  id: string;
  provider_id: string;
  type_name: string;
  type_category: 'general' | 'dental' | 'specialty' | 'diagnostic' | 'procedure';
  description?: string;
  duration_minutes: number;
  base_price?: number;
  virtual_available: boolean;
  in_person_available: boolean;
  requires_questionnaire: boolean;
  requires_consent_form: boolean;
  auto_confirm: boolean;
  buffer_time_before: number;
  buffer_time_after: number;
  max_patients_per_slot: number;
  color_code: string;
  is_active: boolean;
}

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_type_id?: string;
  preferred_date_start?: string;
  preferred_date_end?: string;
  preferred_time_of_day?: 'morning' | 'afternoon' | 'evening' | 'any';
  preferred_days?: string[];
  priority_score: number;
  reason_for_visit?: string;
  notes?: string;
  status: 'active' | 'matched' | 'expired' | 'cancelled';
  matched_appointment_id?: string;
  matched_at?: string;
  expires_at?: string;
}

export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  changed_by_role?: 'patient' | 'provider' | 'admin' | 'system';
  reason?: string;
  notes?: string;
  created_at: string;
}

export interface AppointmentCancellation {
  id: string;
  appointment_id: string;
  cancelled_by?: string;
  cancelled_by_role?: 'patient' | 'provider' | 'admin';
  cancellation_reason: string;
  cancellation_category: 'patient_request' | 'provider_unavailable' | 'emergency' | 'no_show' | 'duplicate' | 'other';
  offered_reschedule: boolean;
  reschedule_accepted?: boolean;
  cancellation_fee_amount: number;
  refund_amount: number;
  refund_status: 'not_applicable' | 'pending' | 'processed' | 'failed';
  refund_processed_at?: string;
}

export interface AppointmentFilters {
  dateRange?: { start: string; end: string };
  status?: Appointment['status'][];
  appointmentType?: string;
  searchQuery?: string;
  locationId?: string;
}

export const enhancedAppointmentService = {
  async getAppointments(
    providerId: string,
    filters: AppointmentFilters = {}
  ): Promise<Appointment[]> {
    const params: Record<string, any> = {
      provider_id: providerId,
      include: 'patients,patients.user_profiles,providers,provider_locations,appointment_types',
      order_by: 'appointment_date:asc,start_time:asc',
    };

    if (filters.dateRange) {
      params.appointment_date_gte = filters.dateRange.start;
      params.appointment_date_lte = filters.dateRange.end;
    }

    if (filters.status && filters.status.length > 0) {
      params.status_in = filters.status.join(',');
    }

    if (filters.appointmentType) {
      params.appointment_type_id = filters.appointmentType;
    }

    if (filters.locationId) {
      params.location_id = filters.locationId;
    }

    const { data, error } = await api.get<Appointment[]>('/appointments', { params });

    if (error) throw error;

    let results = data || [];

    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      results = results.filter(apt =>
        apt.id.toLowerCase().includes(searchLower) ||
        ((apt as any).patients?.user_profiles?.full_name || '').toLowerCase().includes(searchLower) ||
        (apt.reason_for_visit || '').toLowerCase().includes(searchLower)
      );
    }

    return results;
  },

  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async bulkConfirmAppointments(appointmentIds: string[]): Promise<void> {
    const { error } = await api.put('/appointments/bulk-confirm', {
      ids: appointmentIds,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async cancelAppointmentWithDetails(
    appointmentId: string,
    cancellationData: {
      cancelledBy: string;
      cancelledByRole: 'patient' | 'provider' | 'admin';
      reason: string;
      category: AppointmentCancellation['cancellation_category'];
      offeredReschedule?: boolean;
      cancellationFee?: number;
      refundAmount?: number;
    }
  ): Promise<Appointment> {
    const appointment = await appointmentService.updateAppointment(appointmentId, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_fee_assessed: cancellationData.cancellationFee || 0,
    });

    await api.post('/appointment-cancellations', {
      appointment_id: appointmentId,
      cancelled_by: cancellationData.cancelledBy,
      cancelled_by_role: cancellationData.cancelledByRole,
      cancellation_reason: cancellationData.reason,
      cancellation_category: cancellationData.category,
      offered_reschedule: cancellationData.offeredReschedule || false,
      cancellation_fee_amount: cancellationData.cancellationFee || 0,
      refund_amount: cancellationData.refundAmount || 0,
      refund_status: cancellationData.refundAmount ? 'pending' : 'not_applicable',
    });

    try {
      await auditLog.appointmentCancelled(appointmentId, cancellationData.cancelledBy, cancellationData.cancelledByRole, {
        reason: cancellationData.reason,
        category: cancellationData.category,
      });
    } catch {}

    return appointment;
  },

  async approveQuestionnaire(
    appointmentId: string,
    approvedBy: string,
    notes?: string
  ): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      questionnaire_approved_at: new Date().toISOString(),
      questionnaire_approved_by: approvedBy,
    });

    if (error) throw error;
    return data!;
  },

  async checkInPatient(appointmentId: string, examRoom?: string): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'in-progress',
      check_in_time: new Date().toISOString(),
      exam_room: examRoom,
    });

    if (error) throw error;
    return data!;
  },

  async checkOutPatient(appointmentId: string): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'completed',
      check_out_time: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async getStatusHistory(appointmentId: string): Promise<AppointmentStatusHistory[]> {
    const { data, error } = await api.get<AppointmentStatusHistory[]>('/appointment-status-history', {
      params: {
        appointment_id: appointmentId,
        include: 'user_profiles',
        order_by: 'created_at:desc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async getAppointmentTypes(providerId: string): Promise<AppointmentType[]> {
    const { data, error } = await api.get<AppointmentType[]>('/appointment-types', {
      params: {
        provider_id: providerId,
        is_active: true,
        order_by: 'type_name:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async createAppointmentType(typeData: Partial<AppointmentType>): Promise<AppointmentType> {
    const { data, error } = await api.post<AppointmentType>('/appointment-types', typeData);

    if (error) throw error;
    return data!;
  },

  async updateAppointmentType(
    typeId: string,
    updates: Partial<AppointmentType>
  ): Promise<AppointmentType> {
    const { data, error } = await api.put<AppointmentType>(`/appointment-types/${typeId}`, updates);

    if (error) throw error;
    return data!;
  },

  async getWaitlist(providerId: string, status: WaitlistEntry['status'] = 'active'): Promise<WaitlistEntry[]> {
    const { data, error } = await api.get<WaitlistEntry[]>('/appointment-waitlist', {
      params: {
        provider_id: providerId,
        status,
        include: 'patients,patients.user_profiles,appointment_types',
        order_by: 'priority_score:desc,created_at:asc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async addToWaitlist(waitlistData: Partial<WaitlistEntry>): Promise<WaitlistEntry> {
    const { data, error } = await api.post<WaitlistEntry>('/appointment-waitlist', waitlistData);

    if (error) throw error;
    return data!;
  },

  async matchWaitlistToAppointment(
    waitlistId: string,
    appointmentId: string
  ): Promise<WaitlistEntry> {
    const { data, error } = await api.put<WaitlistEntry>(`/appointment-waitlist/${waitlistId}`, {
      status: 'matched',
      matched_appointment_id: appointmentId,
      matched_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async findWaitlistMatches(
    providerId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<WaitlistEntry[]> {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hour = parseInt(startTime.split(':')[0]);
    let timeOfDay: WaitlistEntry['preferred_time_of_day'] = 'any';

    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    const { data, error } = await api.get<WaitlistEntry[]>('/appointment-waitlist', {
      params: {
        provider_id: providerId,
        status: 'active',
        include: 'patients,patients.user_profiles',
        preferred_date_start_lte: date,
        preferred_date_end_gte: date,
        preferred_time_of_day_in: `${timeOfDay},any`,
        order_by: 'priority_score:desc',
      },
    });

    if (error) throw error;

    const matches = (data || []).filter(entry => {
      if (!entry.preferred_days || entry.preferred_days.length === 0) {
        return true;
      }
      return entry.preferred_days.includes(dayOfWeek);
    });

    return matches;
  },

  async updateAppointmentStatus(
    appointmentId: string,
    newStatus: Appointment['status']
  ): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, { status: newStatus });

    if (error) throw error;
    return data!;
  },

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      appointment_date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
    });

    if (error) throw error;

    try {
      await auditLog.appointmentRescheduled(appointmentId, data!.patient_id || '', 'system', {
        new_date: newDate,
        new_start_time: newStartTime,
        new_end_time: newEndTime,
      });
    } catch {}

    return data!;
  },

  async exportAppointments(
    appointments: Appointment[],
    format: 'csv' | 'pdf'
  ): Promise<Blob> {
    if (format === 'csv') {
      const headers = [
        'Date',
        'Time',
        'Patient',
        'Type',
        'Status',
        'Reason',
        'Location'
      ].join(',');

      const rows = appointments.map(apt => [
        apt.appointment_date,
        apt.start_time,
        (apt as any).patients?.user_profiles?.full_name || 'Unknown',
        apt.appointment_type || 'General',
        apt.status,
        apt.reason_for_visit || '',
        (apt as any).provider_locations?.location_name || ''
      ].map(field => `"${field}"`).join(','));

      const csv = [headers, ...rows].join('\n');
      return new Blob([csv], { type: 'text/csv' });
    }

    throw new Error('PDF export not yet implemented');
  },
};
