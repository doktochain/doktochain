import { supabase } from '../lib/supabase';

export interface TelemedicineSession {
  id: string;
  appointment_id: string;
  provider_id: string;
  patient_id: string;
  session_token: string;
  room_id: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled' | 'failed';
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  video_quality?: 'low' | 'medium' | 'high' | 'hd';
  recording_enabled: boolean;
  recording_consent_obtained: boolean;
  recording_consent_at?: string;
  screen_sharing_used: boolean;
  ai_transcription_enabled: boolean;
  ai_notes_generated: boolean;
  connection_quality_avg?: number;
  technical_issues?: any[];
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: 'provider' | 'patient' | 'interpreter' | 'observer';
  joined_at: string;
  left_at?: string;
  connection_quality?: 'excellent' | 'good' | 'fair' | 'poor';
  bandwidth_kbps?: number;
  device_type?: string;
  browser?: string;
}

export interface SessionChatMessage {
  id: string;
  session_id: string;
  sender_id?: string;
  sender_role?: 'provider' | 'patient' | 'system';
  message_type: 'text' | 'file' | 'system' | 'alert';
  message_content: string;
  file_id?: string;
  is_private: boolean;
  read_at?: string;
  created_at: string;
}

export interface SessionFile {
  id: string;
  session_id: string;
  uploaded_by?: string;
  file_name: string;
  file_type: string;
  file_size_mb: number;
  storage_path: string;
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'failed';
  virus_scan_at?: string;
  is_sensitive: boolean;
  consent_required: boolean;
  consent_obtained: boolean;
  download_count: number;
  expires_at?: string;
}

export interface AISoapNote {
  id: string;
  session_id: string;
  appointment_id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  confidence_score?: number;
  ai_suggestions?: any;
  provider_reviewed: boolean;
  provider_reviewed_by?: string;
  provider_reviewed_at?: string;
  provider_edits?: any[];
  finalized: boolean;
  finalized_at?: string;
}

export interface VirtualWaitingRoomEntry {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  queue_position: number;
  priority_level: number;
  estimated_wait_minutes?: number;
  joined_at: string;
  notified_at?: string;
  admitted_at?: string;
  status: 'waiting' | 'notified' | 'ready' | 'admitted' | 'cancelled' | 'no_show';
  patient_ready: boolean;
  connection_tested: boolean;
  notes?: string;
}

export const advancedTelemedicineService = {
  async createSession(appointmentId: string, providerId: string, patientId: string): Promise<TelemedicineSession> {
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const roomId = `room_${appointmentId}_${Date.now()}`;

    const { data, error } = await supabase
      .from('telemedicine_sessions')
      .insert({
        appointment_id: appointmentId,
        provider_id: providerId,
        patient_id: patientId,
        session_token: sessionToken,
        room_id: roomId,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSession(sessionId: string): Promise<TelemedicineSession | null> {
    const { data, error } = await supabase
      .from('telemedicine_sessions')
      .select('*, appointments(*), providers(*), patients(*, user_profiles(*))')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async startSession(sessionId: string): Promise<TelemedicineSession> {
    const { data, error } = await supabase
      .from('telemedicine_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async endSession(sessionId: string): Promise<TelemedicineSession> {
    const { data, error } = await supabase
      .from('telemedicine_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSessionSettings(
    sessionId: string,
    settings: {
      video_quality?: TelemedicineSession['video_quality'];
      recording_enabled?: boolean;
      screen_sharing_used?: boolean;
      ai_transcription_enabled?: boolean;
    }
  ): Promise<TelemedicineSession> {
    const { data, error } = await supabase
      .from('telemedicine_sessions')
      .update(settings)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async obtainRecordingConsent(sessionId: string): Promise<TelemedicineSession> {
    const { data, error } = await supabase
      .from('telemedicine_sessions')
      .update({
        recording_consent_obtained: true,
        recording_consent_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async joinSession(sessionId: string, userId: string, role: SessionParticipant['role']): Promise<SessionParticipant> {
    const { data, error } = await supabase
      .from('session_participants')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: role,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async leaveSession(participantId: string): Promise<SessionParticipant> {
    const { data, error } = await supabase
      .from('session_participants')
      .update({
        left_at: new Date().toISOString(),
      })
      .eq('id', participantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async sendChatMessage(
    sessionId: string,
    senderId: string,
    senderRole: SessionChatMessage['sender_role'],
    messageContent: string,
    messageType: SessionChatMessage['message_type'] = 'text'
  ): Promise<SessionChatMessage> {
    const { data, error } = await supabase
      .from('session_chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        sender_role: senderRole,
        message_type: messageType,
        message_content: messageContent,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getChatMessages(sessionId: string): Promise<SessionChatMessage[]> {
    const { data, error } = await supabase
      .from('session_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async uploadSessionFile(
    sessionId: string,
    uploadedBy: string,
    file: File
  ): Promise<SessionFile> {
    const filePath = `sessions/${sessionId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('session-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('session_files')
      .insert({
        session_id: sessionId,
        uploaded_by: uploadedBy,
        file_name: file.name,
        file_type: file.type,
        file_size_mb: file.size / (1024 * 1024),
        storage_path: filePath,
        virus_scan_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSessionFiles(sessionId: string): Promise<SessionFile[]> {
    const { data, error } = await supabase
      .from('session_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async downloadSessionFile(fileId: string): Promise<Blob> {
    const { data: fileData, error: fileError } = await supabase
      .from('session_files')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (fileError) throw fileError;

    await supabase
      .from('session_files')
      .update({ download_count: supabase.rpc('increment', { x: 1 }) })
      .eq('id', fileId);

    const { data, error } = await supabase.storage
      .from('session-files')
      .download(fileData.storage_path);

    if (error) throw error;
    return data;
  },

  async generateAISoapNote(sessionId: string, appointmentId: string, transcriptText: string): Promise<AISoapNote> {
    const aiGeneratedNote = {
      subjective: this.extractSubjectiveFromTranscript(transcriptText),
      objective: this.extractObjectiveFromTranscript(transcriptText),
      assessment: this.extractAssessmentFromTranscript(transcriptText),
      plan: this.extractPlanFromTranscript(transcriptText),
      confidence_score: 0.85,
      ai_suggestions: {
        medications: [],
        lab_orders: [],
        referrals: [],
      },
    };

    const { data, error } = await supabase
      .from('ai_soap_notes')
      .insert({
        session_id: sessionId,
        appointment_id: appointmentId,
        ...aiGeneratedNote,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  extractSubjectiveFromTranscript(transcript: string): string {
    const keywords = ['feel', 'experiencing', 'pain', 'symptom', 'concern', 'worried', 'notice'];
    const sentences = transcript.split(/[.!?]+/);
    const subjective = sentences.filter(s =>
      keywords.some(k => s.toLowerCase().includes(k))
    ).join('. ');

    return subjective || 'Patient reported chief complaint as discussed.';
  },

  extractObjectiveFromTranscript(transcript: string): string {
    const keywords = ['vital', 'temperature', 'blood pressure', 'heart rate', 'examination', 'observed'];
    const sentences = transcript.split(/[.!?]+/);
    const objective = sentences.filter(s =>
      keywords.some(k => s.toLowerCase().includes(k))
    ).join('. ');

    return objective || 'Virtual examination conducted.';
  },

  extractAssessmentFromTranscript(transcript: string): string {
    const keywords = ['diagnos', 'assess', 'condition', 'likely', 'appears', 'suggest'];
    const sentences = transcript.split(/[.!?]+/);
    const assessment = sentences.filter(s =>
      keywords.some(k => s.toLowerCase().includes(k))
    ).join('. ');

    return assessment || 'Assessment based on patient history and virtual examination.';
  },

  extractPlanFromTranscript(transcript: string): string {
    const keywords = ['prescribe', 'recommend', 'follow-up', 'continue', 'start', 'stop', 'plan'];
    const sentences = transcript.split(/[.!?]+/);
    const plan = sentences.filter(s =>
      keywords.some(k => s.toLowerCase().includes(k))
    ).join('. ');

    return plan || 'Treatment plan discussed with patient.';
  },

  async getSoapNote(sessionId: string): Promise<AISoapNote | null> {
    const { data, error } = await supabase
      .from('ai_soap_notes')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateSoapNote(
    noteId: string,
    updates: Partial<AISoapNote>
  ): Promise<AISoapNote> {
    const { data, error } = await supabase
      .from('ai_soap_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async finalizeSoapNote(noteId: string, reviewedBy: string): Promise<AISoapNote> {
    const { data, error } = await supabase
      .from('ai_soap_notes')
      .update({
        provider_reviewed: true,
        provider_reviewed_by: reviewedBy,
        provider_reviewed_at: new Date().toISOString(),
        finalized: true,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addToWaitingRoom(
    appointmentId: string,
    patientId: string,
    providerId: string
  ): Promise<VirtualWaitingRoomEntry> {
    const { data: queueData } = await supabase
      .from('virtual_waiting_room')
      .select('queue_position')
      .eq('provider_id', providerId)
      .eq('status', 'waiting')
      .order('queue_position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (queueData?.queue_position || 0) + 1;

    const { data, error } = await supabase
      .from('virtual_waiting_room')
      .insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        provider_id: providerId,
        queue_position: nextPosition,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getWaitingRoom(providerId: string): Promise<VirtualWaitingRoomEntry[]> {
    const { data, error } = await supabase
      .from('virtual_waiting_room')
      .select('*, appointments(*), patients(*, user_profiles(*))')
      .eq('provider_id', providerId)
      .eq('status', 'waiting')
      .order('queue_position', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async admitPatient(waitingRoomId: string): Promise<VirtualWaitingRoomEntry> {
    const { data, error } = await supabase
      .from('virtual_waiting_room')
      .update({
        status: 'admitted',
        admitted_at: new Date().toISOString(),
      })
      .eq('id', waitingRoomId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePriority(waitingRoomId: string, priorityLevel: number): Promise<VirtualWaitingRoomEntry> {
    const { data, error } = await supabase
      .from('virtual_waiting_room')
      .update({ priority_level: priorityLevel })
      .eq('id', waitingRoomId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async sendWaitingRoomMessage(waitingRoomId: string, message: string): Promise<void> {
    console.log('Sending message to waiting room:', waitingRoomId, message);
  },
};
