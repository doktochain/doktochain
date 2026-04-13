import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';
import { auditLog } from './auditLogger';
import { consentService } from './consentService';

export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  location_id?: string;
  appointment_type: 'in-person' | 'virtual';
  visit_type: 'initial' | 'follow-up' | 'urgent' | 'routine';
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  reason_for_visit?: string;
  chief_complaint?: string;
  insurance_id?: string;
  video_room_id?: string;
  created_at: string;
}

export interface AppointmentNote {
  id: string;
  appointment_id: string;
  provider_id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  vitals?: Record<string, any>;
  diagnosis_codes?: string[];
  procedure_codes?: string[];
  is_signed: boolean;
}

export const appointmentService = {
  async createAppointment(appointmentData: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await api.post<Appointment>('/appointments', appointmentData);

    if (error) throw error;

    try {
      await blockchainAuditService.logAppointmentCreated(
        data!.id,
        data!.patient_id,
        data!.provider_id,
        {
          appointmentDate: data!.appointment_date,
          type: data!.appointment_type,
          service: data!.reason_for_visit,
        }
      );
    } catch {}

    if (data!.patient_id && data!.provider_id) {
      await consentService.createAppointmentConsent({
        patientId: data!.patient_id,
        providerId: data!.provider_id,
        appointmentId: data!.id,
        appointmentDate: data!.appointment_date,
        startTime: data!.start_time,
        endTime: data!.end_time,
      });
    }

    return data!;
  },

  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    const { data, error } = await api.get<Appointment>(`/appointments/${appointmentId}`, {
      params: { include: 'patients,providers,provider_locations' },
    });

    if (error) throw error;
    return data;
  },

  async getPatientAppointments(
    patientId: string,
    status?: Appointment['status']
  ): Promise<Appointment[]> {
    const params: Record<string, any> = {
      patient_id: patientId,
      include: 'providers,providers.user_profiles,provider_locations',
      order_by: 'appointment_date:desc,start_time:desc',
    };

    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<Appointment[]>('/appointments', { params });

    if (error) throw error;
    return data || [];
  },

  async getProviderAppointments(
    providerId: string,
    date?: string,
    status?: Appointment['status']
  ): Promise<Appointment[]> {
    const params: Record<string, any> = {
      provider_id: providerId,
      include: 'patients,patients.user_profiles,provider_locations',
      order_by: 'appointment_date:asc,start_time:asc',
    };

    if (date) {
      params.appointment_date = date;
    }

    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<Appointment[]>('/appointments', { params });

    if (error) throw error;
    return data || [];
  },

  async updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, updates);

    if (error) throw error;
    return data!;
  },

  async cancelAppointment(
    appointmentId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'cancelled',
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'appointment_cancelled',
        resourceType: 'appointment',
        resourceId: appointmentId,
        actorId: cancelledBy,
        actionData: { reason, cancelled_at: data!.cancelled_at },
      });
    } catch {}

    await consentService.revokeAppointmentConsent(appointmentId, cancelledBy);

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

    await consentService.updateAppointmentConsentWindow({
      appointmentId,
      newDate,
      newStartTime,
      newEndTime,
      actorId: data!.patient_id || '',
    });

    return data!;
  },

  async startVideoConsultation(appointmentId: string): Promise<Appointment> {
    const videoRoomId = `room_${appointmentId}_${Date.now()}`;

    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'in-progress',
      video_room_id: videoRoomId,
      video_started_at: new Date().toISOString(),
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'appointment_updated',
        resourceType: 'appointment',
        resourceId: appointmentId,
        actionData: { action: 'video_started', video_room_id: videoRoomId },
      });
    } catch {}

    return data!;
  },

  async endVideoConsultation(appointmentId: string): Promise<Appointment> {
    const { data, error } = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'completed',
      video_ended_at: new Date().toISOString(),
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'appointment_updated',
        resourceType: 'appointment',
        resourceId: appointmentId,
        actionData: { action: 'video_ended', status: 'completed' },
      });
    } catch {}

    return data!;
  },

  async addAppointmentNote(noteData: Partial<AppointmentNote>): Promise<AppointmentNote> {
    const { data, error } = await api.post<AppointmentNote>('/appointment-notes', noteData);

    if (error) throw error;
    return data!;
  },

  async getAppointmentNotes(appointmentId: string): Promise<AppointmentNote | null> {
    const { data, error } = await api.get<AppointmentNote>(`/appointment-notes/${appointmentId}`);

    if (error) throw error;
    return data;
  },

  async updateAppointmentNote(
    noteId: string,
    updates: Partial<AppointmentNote>
  ): Promise<AppointmentNote> {
    const { data, error } = await api.put<AppointmentNote>(`/appointment-notes/${noteId}`, updates);

    if (error) throw error;
    return data!;
  },

  async signAppointmentNote(noteId: string): Promise<AppointmentNote> {
    const { data, error } = await api.put<AppointmentNote>(`/appointment-notes/${noteId}`, {
      is_signed: true,
      signed_at: new Date().toISOString(),
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'clinical_note_signed',
        resourceType: 'appointment_note',
        resourceId: noteId,
        actionData: { appointment_id: data!.appointment_id, signed_at: data!.signed_at },
      });
    } catch {}

    return data!;
  },

  async getUpcomingAppointmentsCount(userId: string, role: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const params: Record<string, any> = {
      appointment_date_gte: today,
      status_in: 'scheduled,confirmed',
      count_only: true,
    };

    if (role === 'patient') {
      params.patient_id = userId;
    } else if (role === 'provider') {
      params.provider_id = userId;
    }

    const { data, error } = await api.get<{ count: number }>('/appointments', { params });

    if (error) throw error;
    return (data as any)?.count || 0;
  },
};
