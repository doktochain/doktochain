import { api } from '../lib/api-client';
import { storageClient } from '../lib/storage-client';

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

    const { data, error } = await api.post<TelemedicineSession>('/telemedicine-sessions', {
      appointment_id: appointmentId,
      provider_id: providerId,
      patient_id: patientId,
      session_token: sessionToken,
      room_id: roomId,
      status: 'waiting',
    });

    if (error) throw error;
    return data!;
  },

  async getSession(sessionId: string): Promise<TelemedicineSession | null> {
    const { data, error } = await api.get<TelemedicineSession>(`/telemedicine-sessions/${sessionId}`);

    if (error) throw error;
    return data;
  },

  async startSession(sessionId: string): Promise<TelemedicineSession> {
    const { data, error } = await api.put<TelemedicineSession>(`/telemedicine-sessions/${sessionId}`, {
      status: 'active',
      started_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async endSession(sessionId: string): Promise<TelemedicineSession> {
    const { data, error } = await api.put<TelemedicineSession>(`/telemedicine-sessions/${sessionId}`, {
      status: 'completed',
      ended_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
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
    const { data, error } = await api.put<TelemedicineSession>(`/telemedicine-sessions/${sessionId}`, settings);

    if (error) throw error;
    return data!;
  },

  async obtainRecordingConsent(sessionId: string): Promise<TelemedicineSession> {
    const { data, error } = await api.put<TelemedicineSession>(`/telemedicine-sessions/${sessionId}`, {
      recording_consent_obtained: true,
      recording_consent_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async joinSession(sessionId: string, userId: string, role: SessionParticipant['role']): Promise<SessionParticipant> {
    const { data, error } = await api.post<SessionParticipant>('/session-participants', {
      session_id: sessionId,
      user_id: userId,
      role: role,
    });

    if (error) throw error;
    return data!;
  },

  async leaveSession(participantId: string): Promise<SessionParticipant> {
    const { data, error } = await api.put<SessionParticipant>(`/session-participants/${participantId}`, {
      left_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async sendChatMessage(
    sessionId: string,
    senderId: string,
    senderRole: SessionChatMessage['sender_role'],
    messageContent: string,
    messageType: SessionChatMessage['message_type'] = 'text'
  ): Promise<SessionChatMessage> {
    const { data, error } = await api.post<SessionChatMessage>('/session-chat-messages', {
      session_id: sessionId,
      sender_id: senderId,
      sender_role: senderRole,
      message_type: messageType,
      message_content: messageContent,
    });

    if (error) throw error;
    return data!;
  },

  async getChatMessages(sessionId: string): Promise<SessionChatMessage[]> {
    const { data, error } = await api.get<SessionChatMessage[]>('/session-chat-messages', {
      params: { session_id: sessionId, order: 'created_at.asc' }
    });

    if (error) throw error;
    return data || [];
  },

  async uploadSessionFile(
    sessionId: string,
    uploadedBy: string,
    file: File
  ): Promise<SessionFile> {
    const { key } = await storageClient.uploadFile('medical-records', file);

    const { data, error } = await api.post<SessionFile>('/session-files', {
      session_id: sessionId,
      uploaded_by: uploadedBy,
      file_name: file.name,
      file_type: file.type,
      file_size_mb: file.size / (1024 * 1024),
      storage_path: key,
      virus_scan_status: 'pending',
    });

    if (error) throw error;
    return data!;
  },

  async getSessionFiles(sessionId: string): Promise<SessionFile[]> {
    const { data, error } = await api.get<SessionFile[]>('/session-files', {
      params: { session_id: sessionId, order: 'created_at.desc' }
    });

    if (error) throw error;
    return data || [];
  },

  async downloadSessionFile(fileId: string): Promise<Blob> {
    const { data: fileData, error: fileError } = await api.get<{ storage_path: string }>(`/session-files/${fileId}`);

    if (fileError) throw fileError;

    await api.post(`/rpc/increment-download-count`, { file_id: fileId });

    return storageClient.downloadFile(fileData!.storage_path);
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

    const { data, error } = await api.post<AISoapNote>('/ai-soap-notes', {
      session_id: sessionId,
      appointment_id: appointmentId,
      ...aiGeneratedNote,
    });

    if (error) throw error;
    return data!;
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
    const { data, error } = await api.get<AISoapNote>('/ai-soap-notes', {
      params: { session_id: sessionId }
    });

    if (error) throw error;
    const note = Array.isArray(data) ? data[0] || null : data;
    return note;
  },

  async updateSoapNote(
    noteId: string,
    updates: Partial<AISoapNote>
  ): Promise<AISoapNote> {
    const { data, error } = await api.put<AISoapNote>(`/ai-soap-notes/${noteId}`, updates);

    if (error) throw error;
    return data!;
  },

  async finalizeSoapNote(noteId: string, reviewedBy: string): Promise<AISoapNote> {
    const { data, error } = await api.put<AISoapNote>(`/ai-soap-notes/${noteId}`, {
      provider_reviewed: true,
      provider_reviewed_by: reviewedBy,
      provider_reviewed_at: new Date().toISOString(),
      finalized: true,
      finalized_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async addToWaitingRoom(
    appointmentId: string,
    patientId: string,
    providerId: string
  ): Promise<VirtualWaitingRoomEntry> {
    const { data: queueData } = await api.get<VirtualWaitingRoomEntry[]>('/virtual-waiting-room', {
      params: { provider_id: providerId, status: 'waiting', order: 'queue_position.desc', limit: 1 }
    });

    const lastEntry = Array.isArray(queueData) ? queueData[0] : queueData;
    const nextPosition = (lastEntry?.queue_position || 0) + 1;

    const { data, error } = await api.post<VirtualWaitingRoomEntry>('/virtual-waiting-room', {
      appointment_id: appointmentId,
      patient_id: patientId,
      provider_id: providerId,
      queue_position: nextPosition,
      status: 'waiting',
    });

    if (error) throw error;
    return data!;
  },

  async getWaitingRoom(providerId: string): Promise<VirtualWaitingRoomEntry[]> {
    const { data, error } = await api.get<VirtualWaitingRoomEntry[]>('/virtual-waiting-room', {
      params: { provider_id: providerId, status: 'waiting', order: 'queue_position.asc' }
    });

    if (error) throw error;
    return data || [];
  },

  async admitPatient(waitingRoomId: string): Promise<VirtualWaitingRoomEntry> {
    const { data, error } = await api.put<VirtualWaitingRoomEntry>(`/virtual-waiting-room/${waitingRoomId}`, {
      status: 'admitted',
      admitted_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  },

  async updatePriority(waitingRoomId: string, priorityLevel: number): Promise<VirtualWaitingRoomEntry> {
    const { data, error } = await api.put<VirtualWaitingRoomEntry>(`/virtual-waiting-room/${waitingRoomId}`, {
      priority_level: priorityLevel
    });

    if (error) throw error;
    return data!;
  },

  async sendWaitingRoomMessage(waitingRoomId: string, message: string): Promise<void> {
    console.log('Sending message to waiting room:', waitingRoomId, message);
  },
};
