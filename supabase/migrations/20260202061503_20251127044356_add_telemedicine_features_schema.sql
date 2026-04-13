/*
  # Add Premium Telemedicine Features Schema

  1. New Tables
    - `video_consultations` - Video session management
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, foreign key to appointments)
      - `patient_id` (uuid, foreign key to user_profiles)
      - `provider_id` (uuid, foreign key to user_profiles)
      - `session_token` (text, unique)
      - `room_name` (text)
      - `status` (text: scheduled, waiting, in_progress, completed, cancelled)
      - `scheduled_start` (timestamptz)
      - `actual_start` (timestamptz)
      - `actual_end` (timestamptz)
      - `duration_minutes` (integer)
      - `connection_quality` (jsonb)
      - `recording_enabled` (boolean)
      - `recording_url` (text)
      - `system_check_passed` (boolean)
      - `technical_issues` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `consultation_messages` - In-session chat messages
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, foreign key to video_consultations)
      - `sender_id` (uuid, foreign key to user_profiles)
      - `message_text` (text)
      - `message_type` (text: text, file, system)
      - `file_url` (text)
      - `file_name` (text)
      - `file_size` (integer)
      - `created_at` (timestamptz)

    - `secure_messages` - Asynchronous messaging between patient and provider
      - `id` (uuid, primary key)
      - `thread_id` (uuid)
      - `patient_id` (uuid, foreign key to user_profiles)
      - `provider_id` (uuid, foreign key to user_profiles)
      - `sender_id` (uuid, foreign key to user_profiles)
      - `subject` (text)
      - `message_text` (text)
      - `message_type` (text: general, prescription_refill, lab_result, appointment, urgent)
      - `is_urgent` (boolean)
      - `attachments` (jsonb)
      - `read_at` (timestamptz)
      - `replied_at` (timestamptz)
      - `archived` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `e_prescriptions` - FHIR-compliant prescription records
      - `id` (uuid, primary key)
      - `prescription_number` (text, unique)
      - `patient_id` (uuid, foreign key to user_profiles)
      - `provider_id` (uuid, foreign key to user_profiles)
      - `appointment_id` (uuid, foreign key to appointments)
      - `consultation_id` (uuid, foreign key to video_consultations)
      - `medication_name` (text)
      - `medication_generic` (text)
      - `medication_brand` (text)
      - `dosage` (text)
      - `frequency` (text)
      - `quantity` (integer)
      - `refills` (integer)
      - `refills_remaining` (integer)
      - `special_instructions` (text)
      - `side_effects` (text)
      - `warnings` (text)
      - `drug_interactions` (jsonb)
      - `pharmacy_id` (uuid)
      - `status` (text: pending, sent, received, filled, picked_up, cancelled)
      - `prescribed_date` (timestamptz)
      - `expiry_date` (timestamptz)
      - `digital_signature` (text)
      - `fhir_resource` (jsonb)
      - `price_comparison` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `prescription_refill_requests` - Refill request tracking
      - `id` (uuid, primary key)
      - `prescription_id` (uuid, foreign key to e_prescriptions)
      - `patient_id` (uuid, foreign key to user_profiles)
      - `provider_id` (uuid, foreign key to user_profiles)
      - `request_reason` (text)
      - `status` (text: pending, approved, denied, completed)
      - `response_notes` (text)
      - `requested_at` (timestamptz)
      - `responded_at` (timestamptz)

    - `consultation_feedback` - Post-consultation feedback
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, foreign key to video_consultations)
      - `patient_id` (uuid, foreign key to user_profiles)
      - `provider_id` (uuid, foreign key to user_profiles)
      - `rating` (integer: 1-5)
      - `video_quality` (integer: 1-5)
      - `audio_quality` (integer: 1-5)
      - `provider_professionalism` (integer: 1-5)
      - `wait_time_satisfaction` (integer: 1-5)
      - `feedback_text` (text)
      - `would_recommend` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for patients to view/manage their own data
    - Policies for providers to view/manage their patients' data
*/

-- Create video_consultations table
CREATE TABLE IF NOT EXISTS video_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id),
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  session_token text UNIQUE,
  room_name text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled')),
  scheduled_start timestamptz NOT NULL,
  actual_start timestamptz,
  actual_end timestamptz,
  duration_minutes integer,
  connection_quality jsonb DEFAULT '{}',
  recording_enabled boolean DEFAULT false,
  recording_url text,
  system_check_passed boolean DEFAULT false,
  technical_issues jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create consultation_messages table
CREATE TABLE IF NOT EXISTS consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES video_consultations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES user_profiles(id) NOT NULL,
  message_text text,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url text,
  file_name text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Create secure_messages table
CREATE TABLE IF NOT EXISTS secure_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  sender_id uuid REFERENCES user_profiles(id) NOT NULL,
  subject text NOT NULL,
  message_text text NOT NULL,
  message_type text DEFAULT 'general' CHECK (message_type IN ('general', 'prescription_refill', 'lab_result', 'appointment', 'urgent')),
  is_urgent boolean DEFAULT false,
  attachments jsonb DEFAULT '[]',
  read_at timestamptz,
  replied_at timestamptz,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create e_prescriptions table
CREATE TABLE IF NOT EXISTS e_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number text UNIQUE NOT NULL,
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  appointment_id uuid REFERENCES appointments(id),
  consultation_id uuid REFERENCES video_consultations(id),
  medication_name text NOT NULL,
  medication_generic text,
  medication_brand text,
  dosage text NOT NULL,
  frequency text NOT NULL,
  quantity integer NOT NULL,
  refills integer DEFAULT 0,
  refills_remaining integer DEFAULT 0,
  special_instructions text,
  side_effects text,
  warnings text,
  drug_interactions jsonb DEFAULT '[]',
  pharmacy_id uuid,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'filled', 'picked_up', 'cancelled')),
  prescribed_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  digital_signature text,
  fhir_resource jsonb DEFAULT '{}',
  price_comparison jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create prescription_refill_requests table
CREATE TABLE IF NOT EXISTS prescription_refill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES e_prescriptions(id) NOT NULL,
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  request_reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  response_notes text,
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

-- Create consultation_feedback table
CREATE TABLE IF NOT EXISTS consultation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES video_consultations(id) NOT NULL,
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  video_quality integer CHECK (video_quality >= 1 AND video_quality <= 5),
  audio_quality integer CHECK (audio_quality >= 1 AND audio_quality <= 5),
  provider_professionalism integer CHECK (provider_professionalism >= 1 AND provider_professionalism <= 5),
  wait_time_satisfaction integer CHECK (wait_time_satisfaction >= 1 AND wait_time_satisfaction <= 5),
  feedback_text text,
  would_recommend boolean,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_consultations_patient ON video_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_video_consultations_provider ON video_consultations(provider_id);
CREATE INDEX IF NOT EXISTS idx_video_consultations_status ON video_consultations(status);
CREATE INDEX IF NOT EXISTS idx_secure_messages_thread ON secure_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_secure_messages_patient ON secure_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_secure_messages_provider ON secure_messages(provider_id);
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_patient ON e_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_provider ON e_prescriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_e_prescriptions_status ON e_prescriptions(status);

-- Enable Row Level Security
ALTER TABLE video_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE e_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_refill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_consultations
CREATE POLICY "Patients can view own consultations"
  ON video_consultations FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view their consultations"
  ON video_consultations FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Patients can update own consultations"
  ON video_consultations FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Providers can update their consultations"
  ON video_consultations FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- RLS Policies for consultation_messages
CREATE POLICY "Consultation participants can view messages"
  ON consultation_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM video_consultations
      WHERE video_consultations.id = consultation_messages.consultation_id
      AND (video_consultations.patient_id = auth.uid() OR video_consultations.provider_id = auth.uid())
    )
  );

CREATE POLICY "Consultation participants can send messages"
  ON consultation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_consultations
      WHERE video_consultations.id = consultation_id
      AND (video_consultations.patient_id = auth.uid() OR video_consultations.provider_id = auth.uid())
    )
    AND auth.uid() = sender_id
  );

-- RLS Policies for secure_messages
CREATE POLICY "Patients can view own messages"
  ON secure_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = sender_id);

CREATE POLICY "Providers can view their messages"
  ON secure_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id OR auth.uid() = sender_id);

CREATE POLICY "Patients can send messages"
  ON secure_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id AND auth.uid() = sender_id);

CREATE POLICY "Providers can send messages"
  ON secure_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id AND auth.uid() = sender_id);

CREATE POLICY "Message participants can update"
  ON secure_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = patient_id OR auth.uid() = provider_id);

-- RLS Policies for e_prescriptions
CREATE POLICY "Patients can view own prescriptions"
  ON e_prescriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view their prescriptions"
  ON e_prescriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can create prescriptions"
  ON e_prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update their prescriptions"
  ON e_prescriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- RLS Policies for prescription_refill_requests
CREATE POLICY "Patients can view own refill requests"
  ON prescription_refill_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view their refill requests"
  ON prescription_refill_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Patients can create refill requests"
  ON prescription_refill_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Providers can update refill requests"
  ON prescription_refill_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- RLS Policies for consultation_feedback
CREATE POLICY "Patients can view own feedback"
  ON consultation_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view feedback about them"
  ON consultation_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Patients can create feedback"
  ON consultation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own feedback"
  ON consultation_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);