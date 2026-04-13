import { supabase } from '../lib/supabase';
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
  // Create appointment
  async createAppointment(appointmentData: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) throw error;

    try {
      await blockchainAuditService.logAppointmentCreated(
        data.id,
        data.patient_id,
        data.provider_id,
        {
          appointmentDate: data.appointment_date,
          type: data.appointment_type,
          service: data.reason_for_visit,
        }
      );
    } catch {}

    if (data.patient_id && data.provider_id) {
      await consentService.createAppointmentConsent({
        patientId: data.patient_id,
        providerId: data.provider_id,
        appointmentId: data.id,
        appointmentDate: data.appointment_date,
        startTime: data.start_time,
        endTime: data.end_time,
      });
    }

    return data;
  },

  // Get appointment by ID
  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*), providers(*), provider_locations(*)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Get patient appointments
  async getPatientAppointments(
    patientId: string,
    status?: Appointment['status']
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select('*, providers(*, user_profiles(*)), provider_locations(*)')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Get provider appointments
  async getProviderAppointments(
    providerId: string,
    date?: string,
    status?: Appointment['status']
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select('*, patients(*, user_profiles(*)), provider_locations(*)')
      .eq('provider_id', providerId);

    if (date) {
      query = query.eq('appointment_date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Update appointment
  async updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cancel appointment
  async cancelAppointment(
    appointmentId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'appointment_cancelled',
        resourceType: 'appointment',
        resourceId: appointmentId,
        actorId: cancelledBy,
        actionData: { reason, cancelled_at: data.cancelled_at },
      });
    } catch {}

    await consentService.revokeAppointmentConsent(appointmentId, cancelledBy);

    return data;
  },

  // Reschedule appointment
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    try {
      await auditLog.appointmentRescheduled(appointmentId, data.patient_id || '', 'system', {
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
      actorId: data.patient_id || '',
    });

    return data;
  },

  // Start video consultation
  async startVideoConsultation(appointmentId: string): Promise<Appointment> {
    const videoRoomId = `room_${appointmentId}_${Date.now()}`;

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'in-progress',
        video_room_id: videoRoomId,
        video_started_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'appointment_updated',
        resourceType: 'appointment',
        resourceId: appointmentId,
        actionData: { action: 'video_started', video_room_id: videoRoomId },
      });
    } catch {}

    return data;
  },

  // End video consultation
  async endVideoConsultation(appointmentId: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        video_ended_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'appointment_updated',
        resourceType: 'appointment',
        resourceId: appointmentId,
        actionData: { action: 'video_ended', status: 'completed' },
      });
    } catch {}

    return data;
  },

  // Add appointment notes
  async addAppointmentNote(noteData: Partial<AppointmentNote>): Promise<AppointmentNote> {
    const { data, error } = await supabase
      .from('appointment_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get appointment notes
  async getAppointmentNotes(appointmentId: string): Promise<AppointmentNote | null> {
    const { data, error } = await supabase
      .from('appointment_notes')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Update appointment notes
  async updateAppointmentNote(
    noteId: string,
    updates: Partial<AppointmentNote>
  ): Promise<AppointmentNote> {
    const { data, error } = await supabase
      .from('appointment_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Sign appointment notes
  async signAppointmentNote(noteId: string): Promise<AppointmentNote> {
    const { data, error } = await supabase
      .from('appointment_notes')
      .update({
        is_signed: true,
        signed_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'clinical_note_signed',
        resourceType: 'appointment_note',
        resourceId: noteId,
        actionData: { appointment_id: data.appointment_id, signed_at: data.signed_at },
      });
    } catch {}

    return data;
  },

  // Get upcoming appointments count
  async getUpcomingAppointmentsCount(userId: string, role: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('appointment_date', today)
      .in('status', ['scheduled', 'confirmed']);

    if (role === 'patient') {
      query = query.eq('patient_id', userId);
    } else if (role === 'provider') {
      query = query.eq('provider_id', userId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  },
};
