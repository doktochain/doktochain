/*
  # Advanced Telemedicine Features Schema

  ## Overview
  Comprehensive telemedicine platform with video consultations, AI-powered notes,
  file sharing, and real-time collaboration features.

  ## New Tables Created

  ### 1. telemedicine_sessions
    - Video consultation session tracking
    - Recording metadata and consent
    - Session duration and quality metrics
    - AI transcription and notes

  ### 2. session_participants
    - Track all participants in a session
    - Join/leave timestamps
    - Connection quality metrics

  ### 3. session_chat_messages
    - In-consultation text chat
    - File sharing links
    - System messages

  ### 4. session_recordings
    - Recording storage metadata
    - Patient consent tracking
    - Expiry and access logs

  ### 5. session_files
    - Secure file sharing during consultation
    - Upload/download tracking
    - Virus scan status
    - Expiry management

  ### 6. ai_transcriptions
    - Real-time transcription data
    - Speaker identification
    - Medical terminology extraction
    - Edit history

  ### 7. ai_soap_notes
    - AI-generated SOAP notes
    - Subjective, Objective, Assessment, Plan sections
    - Provider review status
    - Edit history

  ### 8. consultation_workflow_steps
    - Pre/during/post consultation tasks
    - Completion tracking
    - Automated reminders

  ### 9. virtual_waiting_room
    - Patient queue management
    - Estimated wait times
    - Priority settings
    - Auto-admit configuration

  ## Security
  - RLS enabled on all tables
  - Encrypted file storage references
  - Audit logging for all access
  - HIPAA-compliant data handling
*/

-- Telemedicine sessions table
CREATE TABLE IF NOT EXISTS telemedicine_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  room_id text UNIQUE NOT NULL,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled', 'failed')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer,
  video_quality text CHECK (video_quality IN ('low', 'medium', 'high', 'hd')),
  recording_enabled boolean DEFAULT false,
  recording_consent_obtained boolean DEFAULT false,
  recording_consent_at timestamptz,
  screen_sharing_used boolean DEFAULT false,
  ai_transcription_enabled boolean DEFAULT false,
  ai_notes_generated boolean DEFAULT false,
  connection_quality_avg decimal(3, 2),
  technical_issues jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session participants tracking
CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('provider', 'patient', 'interpreter', 'observer')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  connection_quality text CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor')),
  bandwidth_kbps integer,
  device_type text,
  browser text,
  issues_reported jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Session chat messages
CREATE TABLE IF NOT EXISTS session_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text CHECK (sender_role IN ('provider', 'patient', 'system')),
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'alert')),
  message_content text NOT NULL,
  file_id uuid,
  is_private boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Session recordings
CREATE TABLE IF NOT EXISTS session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_size_mb decimal(10, 2),
  duration_minutes integer,
  format text DEFAULT 'mp4',
  quality text CHECK (quality IN ('low', 'medium', 'high', 'hd')),
  encryption_key_id text,
  patient_consent_id uuid,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Session files (shared during consultation)
CREATE TABLE IF NOT EXISTS session_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size_mb decimal(10, 2),
  storage_path text NOT NULL,
  virus_scan_status text DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'failed')),
  virus_scan_at timestamptz,
  is_sensitive boolean DEFAULT false,
  consent_required boolean DEFAULT false,
  consent_obtained boolean DEFAULT false,
  download_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- AI transcriptions
CREATE TABLE IF NOT EXISTS ai_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  transcript_text text,
  speaker_segments jsonb DEFAULT '[]'::jsonb,
  medical_terms_extracted jsonb DEFAULT '[]'::jsonb,
  confidence_score decimal(3, 2),
  language text DEFAULT 'en',
  processing_status text DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI-generated SOAP notes
CREATE TABLE IF NOT EXISTS ai_soap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  subjective text,
  objective text,
  assessment text,
  plan text,
  confidence_score decimal(3, 2),
  ai_suggestions jsonb DEFAULT '{}'::jsonb,
  provider_reviewed boolean DEFAULT false,
  provider_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_reviewed_at timestamptz,
  provider_edits jsonb DEFAULT '[]'::jsonb,
  finalized boolean DEFAULT false,
  finalized_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Consultation workflow steps
CREATE TABLE IF NOT EXISTS consultation_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  step_type text NOT NULL CHECK (step_type IN ('pre_session', 'during_session', 'post_session')),
  step_name text NOT NULL,
  description text,
  required boolean DEFAULT false,
  completed boolean DEFAULT false,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  due_at timestamptz,
  reminder_sent boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Virtual waiting room
CREATE TABLE IF NOT EXISTS virtual_waiting_room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  queue_position integer NOT NULL,
  priority_level integer DEFAULT 0,
  estimated_wait_minutes integer,
  joined_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  admitted_at timestamptz,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'ready', 'admitted', 'cancelled', 'no_show')),
  patient_ready boolean DEFAULT false,
  connection_tested boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_appointment ON telemedicine_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_provider ON telemedicine_sessions(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_patient ON telemedicine_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_chat_session ON session_chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_files_session ON session_files(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_soap_notes_appointment ON ai_soap_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_virtual_waiting_room_provider ON virtual_waiting_room(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_virtual_waiting_room_queue ON virtual_waiting_room(provider_id, queue_position) WHERE status = 'waiting';

-- Enable RLS
ALTER TABLE telemedicine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_waiting_room ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telemedicine_sessions
CREATE POLICY "Users can view their sessions"
  ON telemedicine_sessions FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can manage their sessions"
  ON telemedicine_sessions FOR ALL
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

-- RLS Policies for session_participants
CREATE POLICY "Users can view participants in their sessions"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert themselves as participants"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participant record"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for session_chat_messages
CREATE POLICY "Users can view chat in their sessions"
  ON session_chat_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their sessions"
  ON session_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for session_files
CREATE POLICY "Users can view files in their sessions"
  ON session_files FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload files to their sessions"
  ON session_files FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for ai_soap_notes
CREATE POLICY "Providers can manage SOAP notes for their sessions"
  ON ai_soap_notes FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Patients can view finalized SOAP notes"
  ON ai_soap_notes FOR SELECT
  TO authenticated
  USING (
    finalized = true
    AND session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for virtual_waiting_room
CREATE POLICY "Providers can view their waiting room"
  ON virtual_waiting_room FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients can view their waiting room entry"
  ON virtual_waiting_room FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can manage their waiting room"
  ON virtual_waiting_room FOR ALL
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

-- Function to update session duration on completion
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session duration
DROP TRIGGER IF EXISTS session_duration_trigger ON telemedicine_sessions;
CREATE TRIGGER session_duration_trigger
  BEFORE UPDATE ON telemedicine_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_session_duration();

-- Function to auto-update waiting room queue positions
CREATE OR REPLACE FUNCTION update_waiting_room_positions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('admitted', 'cancelled', 'no_show') THEN
    UPDATE virtual_waiting_room
    SET queue_position = queue_position - 1,
        updated_at = now()
    WHERE provider_id = NEW.provider_id
      AND status = 'waiting'
      AND queue_position > OLD.queue_position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for waiting room queue management
DROP TRIGGER IF EXISTS waiting_room_position_trigger ON virtual_waiting_room;
CREATE TRIGGER waiting_room_position_trigger
  AFTER UPDATE ON virtual_waiting_room
  FOR EACH ROW
  WHEN (OLD.status = 'waiting' AND NEW.status != 'waiting')
  EXECUTE FUNCTION update_waiting_room_positions();
