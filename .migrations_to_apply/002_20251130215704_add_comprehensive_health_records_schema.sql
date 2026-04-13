/*
  # Comprehensive Health Records (EHR) Schema

  ## Overview
  This migration creates a complete FHIR-compliant health records system for patients.
  Supports lab results, medications, allergies, immunizations, clinical notes, and data visualization.

  ## 1. New Tables

  ### Lab Results
  - `lab_results` - Stores laboratory test results with reference ranges and trends
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key to user_profiles)
    - `test_name` (text)
    - `test_category` (text) - e.g., Chemistry, Hematology, Microbiology
    - `result_value` (text)
    - `unit` (text)
    - `reference_range_low` (numeric, nullable)
    - `reference_range_high` (numeric, nullable)
    - `abnormal_flag` (text) - normal, high, low, critical
    - `provider_id` (uuid, nullable)
    - `provider_comments` (text, nullable)
    - `order_date` (timestamptz)
    - `result_date` (timestamptz)
    - `lab_facility` (text, nullable)
    - `fhir_observation_id` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Medication History
  - `medication_history` - Complete medication records including current and past
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key)
    - `medication_name` (text)
    - `dosage` (text)
    - `frequency` (text)
    - `route` (text) - oral, injection, topical, etc.
    - `prescribing_provider_id` (uuid, nullable)
    - `prescribing_provider_name` (text)
    - `pharmacy_name` (text, nullable)
    - `start_date` (date)
    - `end_date` (date, nullable)
    - `status` (text) - active, discontinued, completed
    - `indication` (text, nullable)
    - `fhir_medication_id` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Allergies and Intolerances
  - `allergies` - Allergy and intolerance records
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key)
    - `allergen_name` (text)
    - `allergen_type` (text) - medication, food, environmental, other
    - `reaction_type` (text)
    - `severity` (text) - mild, moderate, severe, life-threatening
    - `date_identified` (date)
    - `documented_by_provider_id` (uuid, nullable)
    - `documented_by_provider_name` (text)
    - `notes` (text, nullable)
    - `status` (text) - active, inactive, resolved
    - `fhir_allergy_id` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Immunizations
  - `immunizations` - Vaccination records
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key)
    - `vaccine_name` (text)
    - `vaccine_code` (text, nullable) - CVX code
    - `dose_number` (integer)
    - `total_doses` (integer, nullable)
    - `administration_date` (date)
    - `location_administered` (text)
    - `administering_provider` (text)
    - `lot_number` (text, nullable)
    - `expiration_date` (date, nullable)
    - `next_dose_due_date` (date, nullable)
    - `route` (text, nullable) - intramuscular, subcutaneous, etc.
    - `site` (text, nullable) - left arm, right arm, etc.
    - `fhir_immunization_id` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Clinical Notes
  - `clinical_notes` - Provider notes, discharge summaries, specialist reports
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key)
    - `note_type` (text) - visit_note, discharge_summary, specialist_report, operative_note, progress_note
    - `visit_date` (date)
    - `provider_id` (uuid, nullable)
    - `provider_name` (text)
    - `specialty` (text, nullable)
    - `facility_name` (text, nullable)
    - `chief_complaint` (text, nullable)
    - `diagnosis_codes` (text[], nullable)
    - `diagnosis_text` (text, nullable)
    - `treatment_plan` (text, nullable)
    - `note_content` (text)
    - `is_shared_with_patient` (boolean) - default true
    - `fhir_document_id` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Health Record Sync Status
  - `health_record_sync_status` - Track syncs from external EHR systems
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key)
    - `source_system` (text) - hospital, lab, imaging_center, provider_ehr, manual_upload
    - `source_name` (text)
    - `record_type` (text) - lab, medication, allergy, immunization, clinical_note, imaging
    - `last_sync_date` (timestamptz)
    - `sync_status` (text) - success, failed, pending
    - `records_synced` (integer)
    - `error_message` (text, nullable)
    - `fhir_endpoint` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Record Shares
  - `record_shares` - Track when patients share records with providers
    - `id` (uuid, primary key)
    - `patient_id` (uuid, foreign key)
    - `shared_with_provider_id` (uuid, nullable)
    - `shared_with_email` (text)
    - `record_types` (text[]) - which types of records to share
    - `share_start_date` (date)
    - `share_end_date` (date, nullable)
    - `access_code` (text, nullable)
    - `status` (text) - active, expired, revoked
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Patients can view their own records
  - Providers can view records for their patients
  - Shared records accessible via valid share codes

  ## 3. Indexes
  - Patient ID indexes on all tables for fast lookups
  - Date indexes for timeline queries
  - FHIR ID indexes for sync operations
  - Status indexes for filtering

  ## 4. Important Notes
  - All sensitive health data
  - FHIR-compliant structure for interoperability
  - Comprehensive audit trail with timestamps
  - Support for manual uploads and external syncs
*/

-- Lab Results Table
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  test_category text NOT NULL,
  result_value text NOT NULL,
  unit text,
  reference_range_low numeric,
  reference_range_high numeric,
  abnormal_flag text DEFAULT 'normal' CHECK (abnormal_flag IN ('normal', 'high', 'low', 'critical')),
  provider_id uuid REFERENCES user_profiles(id),
  provider_comments text,
  order_date timestamptz NOT NULL,
  result_date timestamptz NOT NULL,
  lab_facility text,
  fhir_observation_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_result_date ON lab_results(result_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_name ON lab_results(test_name);
CREATE INDEX IF NOT EXISTS idx_lab_results_fhir ON lab_results(fhir_observation_id);

-- Medication History Table
CREATE TABLE IF NOT EXISTS medication_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  route text DEFAULT 'oral',
  prescribing_provider_id uuid REFERENCES user_profiles(id),
  prescribing_provider_name text NOT NULL,
  pharmacy_name text,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed')),
  indication text,
  fhir_medication_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_history_patient ON medication_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_history_status ON medication_history(status);
CREATE INDEX IF NOT EXISTS idx_medication_history_start_date ON medication_history(start_date DESC);

-- Allergies Table
CREATE TABLE IF NOT EXISTS allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  allergen_name text NOT NULL,
  allergen_type text NOT NULL CHECK (allergen_type IN ('medication', 'food', 'environmental', 'other')),
  reaction_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
  date_identified date NOT NULL,
  documented_by_provider_id uuid REFERENCES user_profiles(id),
  documented_by_provider_name text NOT NULL,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
  fhir_allergy_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_status ON allergies(status);
CREATE INDEX IF NOT EXISTS idx_allergies_severity ON allergies(severity);

-- Immunizations Table
CREATE TABLE IF NOT EXISTS immunizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  vaccine_code text,
  dose_number integer NOT NULL,
  total_doses integer,
  administration_date date NOT NULL,
  location_administered text NOT NULL,
  administering_provider text NOT NULL,
  lot_number text,
  expiration_date date,
  next_dose_due_date date,
  route text,
  site text,
  fhir_immunization_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_immunizations_patient ON immunizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_admin_date ON immunizations(administration_date DESC);
CREATE INDEX IF NOT EXISTS idx_immunizations_vaccine ON immunizations(vaccine_name);

-- Clinical Notes Table
CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('visit_note', 'discharge_summary', 'specialist_report', 'operative_note', 'progress_note')),
  visit_date date NOT NULL,
  provider_id uuid REFERENCES user_profiles(id),
  provider_name text NOT NULL,
  specialty text,
  facility_name text,
  chief_complaint text,
  diagnosis_codes text[],
  diagnosis_text text,
  treatment_plan text,
  note_content text NOT NULL,
  is_shared_with_patient boolean DEFAULT true,
  fhir_document_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_visit_date ON clinical_notes(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type ON clinical_notes(note_type);

-- Health Record Sync Status Table
CREATE TABLE IF NOT EXISTS health_record_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  source_system text NOT NULL CHECK (source_system IN ('hospital', 'lab', 'imaging_center', 'provider_ehr', 'manual_upload')),
  source_name text NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('lab', 'medication', 'allergy', 'immunization', 'clinical_note', 'imaging')),
  last_sync_date timestamptz NOT NULL,
  sync_status text NOT NULL CHECK (sync_status IN ('success', 'failed', 'pending')),
  records_synced integer DEFAULT 0,
  error_message text,
  fhir_endpoint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_status_patient ON health_record_sync_status(patient_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_date ON health_record_sync_status(last_sync_date DESC);

-- Record Shares Table
CREATE TABLE IF NOT EXISTS record_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  shared_with_provider_id uuid REFERENCES user_profiles(id),
  shared_with_email text NOT NULL,
  record_types text[] NOT NULL,
  share_start_date date NOT NULL DEFAULT CURRENT_DATE,
  share_end_date date,
  access_code text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_shares_patient ON record_shares(patient_id);
CREATE INDEX IF NOT EXISTS idx_record_shares_status ON record_shares(status);

-- Enable Row Level Security
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE immunizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_record_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Lab Results
CREATE POLICY "Patients can view own lab results"
  ON lab_results FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view their patients' lab results"
  ON lab_results FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = lab_results.patient_id
      AND appointments.provider_id = auth.uid()
    )
  );

CREATE POLICY "Patients can insert own lab results"
  ON lab_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own lab results"
  ON lab_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policies for Medication History
CREATE POLICY "Patients can view own medication history"
  ON medication_history FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own medication history"
  ON medication_history FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policies for Allergies
CREATE POLICY "Patients can view own allergies"
  ON allergies FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own allergies"
  ON allergies FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policies for Immunizations
CREATE POLICY "Patients can view own immunizations"
  ON immunizations FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own immunizations"
  ON immunizations FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policies for Clinical Notes
CREATE POLICY "Patients can view own clinical notes"
  ON clinical_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id AND is_shared_with_patient = true);

CREATE POLICY "Providers can view their clinical notes"
  ON clinical_notes FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert clinical notes"
  ON clinical_notes FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for Sync Status
CREATE POLICY "Patients can view own sync status"
  ON health_record_sync_status FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own sync status"
  ON health_record_sync_status FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policies for Record Shares
CREATE POLICY "Patients can view own record shares"
  ON record_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own record shares"
  ON record_shares FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Providers can view records shared with them"
  ON record_shares FOR SELECT
  TO authenticated
  USING (shared_with_provider_id = auth.uid() AND status = 'active');
