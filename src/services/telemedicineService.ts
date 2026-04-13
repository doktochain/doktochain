import { supabase } from '../lib/supabase';

export interface VideoConsultation {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  session_token: string;
  room_name: string;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_start: string;
  actual_start?: string;
  actual_end?: string;
  duration_minutes?: number;
  connection_quality?: Record<string, unknown>;
  recording_enabled: boolean;
  recording_url?: string;
  system_check_passed: boolean;
  technical_issues?: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ConsultationMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  message_text?: string;
  message_type: 'text' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
}

export interface SecureMessage {
  id: string;
  thread_id: string;
  patient_id: string;
  provider_id: string;
  sender_id: string;
  subject: string;
  message_text: string;
  message_type: 'general' | 'prescription_refill' | 'lab_result' | 'appointment' | 'urgent';
  is_urgent: boolean;
  attachments?: unknown[];
  read_at?: string;
  replied_at?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface EPrescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  consultation_id?: string;
  medication_name: string;
  medication_generic?: string;
  medication_brand?: string;
  dosage: string;
  frequency: string;
  quantity: number;
  refills: number;
  refills_remaining: number;
  special_instructions?: string;
  side_effects?: string;
  warnings?: string;
  drug_interactions?: unknown[];
  pharmacy_id?: string;
  status: 'pending' | 'sent' | 'received' | 'filled' | 'picked_up' | 'cancelled';
  prescribed_date: string;
  expiry_date: string;
  digital_signature?: string;
  fhir_resource?: Record<string, unknown>;
  price_comparison?: unknown[];
  created_at: string;
  updated_at: string;
}

export interface PrescriptionRefillRequest {
  id: string;
  prescription_id: string;
  patient_id: string;
  provider_id: string;
  request_reason?: string;
  status: 'pending' | 'approved' | 'denied' | 'completed';
  response_notes?: string;
  requested_at: string;
  responded_at?: string;
}

export const telemedicineService = {
  async createVideoConsultation(data: {
    appointment_id: string;
    patient_id: string;
    provider_id: string;
    scheduled_start: string;
  }): Promise<{ data: VideoConsultation | null; error: Error | null }> {
    try {
      const { data: consultation, error } = await supabase
        .from('video_consultations')
        .insert({
          ...data,
          session_token: crypto.randomUUID(),
          room_name: `consultation-${Date.now()}`,
          status: 'scheduled',
          recording_enabled: false,
          system_check_passed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: consultation, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPatientConsultations(patientId: string): Promise<{
    data: VideoConsultation[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('video_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateConsultationStatus(
    consultationId: string,
    status: VideoConsultation['status'],
    updates?: Partial<VideoConsultation>
  ): Promise<{ data: VideoConsultation | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('video_consultations')
        .update({ status, ...updates, updated_at: new Date().toISOString() })
        .eq('id', consultationId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async sendConsultationMessage(message: {
    consultation_id: string;
    sender_id: string;
    message_text?: string;
    message_type: ConsultationMessage['message_type'];
    file_url?: string;
    file_name?: string;
    file_size?: number;
  }): Promise<{ data: ConsultationMessage | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('consultation_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getConsultationMessages(consultationId: string): Promise<{
    data: ConsultationMessage[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async sendSecureMessage(message: {
    thread_id?: string;
    patient_id: string;
    provider_id: string;
    sender_id: string;
    subject: string;
    message_text: string;
    message_type: SecureMessage['message_type'];
    is_urgent?: boolean;
    attachments?: unknown[];
  }): Promise<{ data: SecureMessage | null; error: Error | null }> {
    try {
      const threadId = message.thread_id || crypto.randomUUID();
      const { data, error } = await supabase
        .from('secure_messages')
        .insert({
          ...message,
          thread_id: threadId,
          is_urgent: message.is_urgent || false,
          archived: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPatientMessages(patientId: string): Promise<{
    data: SecureMessage[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('secure_messages')
        .select('*')
        .eq('patient_id', patientId)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getMessageThread(threadId: string): Promise<{
    data: SecureMessage[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('secure_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async markMessageAsRead(messageId: string): Promise<{
    data: SecureMessage | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('secure_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPatientPrescriptions(patientId: string): Promise<{
    data: EPrescription[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('e_prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getPrescriptionById(prescriptionId: string): Promise<{
    data: EPrescription | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('e_prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async requestPrescriptionRefill(data: {
    prescription_id: string;
    patient_id: string;
    provider_id: string;
    request_reason?: string;
  }): Promise<{ data: PrescriptionRefillRequest | null; error: Error | null }> {
    try {
      const { data: request, error } = await supabase
        .from('prescription_refill_requests')
        .insert({
          ...data,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { data: request, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getRefillRequests(patientId: string): Promise<{
    data: PrescriptionRefillRequest[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .select('*')
        .eq('patient_id', patientId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async submitConsultationFeedback(data: {
    consultation_id: string;
    patient_id: string;
    provider_id: string;
    rating: number;
    video_quality?: number;
    audio_quality?: number;
    provider_professionalism?: number;
    wait_time_satisfaction?: number;
    feedback_text?: string;
    would_recommend?: boolean;
  }): Promise<{ data: unknown | null; error: Error | null }> {
    try {
      const { data: feedback, error } = await supabase
        .from('consultation_feedback')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return { data: feedback, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};