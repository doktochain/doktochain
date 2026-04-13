/*
  # Comprehensive EHR & FHIR Compliance System

  ## Overview
  This migration adds complete FHIR-compliant clinical documentation, blockchain audit logging,
  smart templates, and clinical workflow management for provider and patient portals.

  ## 1. New Tables

  ### FHIR Clinical Data
  - `fhir_observations` - FHIR Observation resources (vital signs, measurements)
  - `fhir_conditions` - FHIR Condition resources (diagnoses, problems)
  - `fhir_medication_requests` - FHIR MedicationRequest resources (prescriptions)
  - `fhir_procedures` - FHIR Procedure resources (treatments, interventions)
  - `fhir_allergy_intolerances` - FHIR AllergyIntolerance resources

  ### Clinical Templates
  - `clinical_templates` - Specialty-specific documentation templates
  - `icd10_codes` - ICD-10-CA diagnosis code lookup
  - `procedure_codes` - CPT/CCI procedure code lookup

  ### Clinical Notes Advanced
  - `soap_notes` - Structured SOAP format notes
  - `consultation_notes` - Specialist consultation documentation
  - `procedure_notes` - Procedure documentation

  ### Blockchain & Audit
  - `blockchain_audit_log` - Immutable audit trail with blockchain integration
  - `clinical_data_hashes` - SHA-256 hashes of clinical entries
  - `provider_digital_signatures` - Provider signatures for attestation

  ## 2. Security
  - Enable RLS on all tables
  - Policies for provider/patient access
  - Audit log protection (no deletions allowed)
*/

-- =====================================================
-- FHIR-COMPLIANT CLINICAL DATA TABLES
-- =====================================================

-- FHIR Observations (vital signs, lab results, measurements)
CREATE TABLE IF NOT EXISTS fhir_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES user_profiles(id),
  appointment_id uuid REFERENCES appointments(id),

  observation_code text NOT NULL,
  observation_display text NOT NULL,
  category text[] DEFAULT ARRAY['vital-signs'],

  value_quantity numeric,
  value_unit text,
  value_string text,
  value_boolean boolean,
  value_codeable_concept jsonb,

  components jsonb,

  reference_range_low numeric,
  reference_range_high numeric,
  reference_range_text text,

  interpretation text CHECK (interpretation IN ('normal', 'abnormal', 'critical', 'high', 'low')),
  status text DEFAULT 'final' CHECK (status IN ('registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled')),

  effective_datetime timestamptz NOT NULL DEFAULT now(),
  issued timestamptz DEFAULT now(),

  notes text,
  data_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_observations_patient ON fhir_observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_observations_provider ON fhir_observations(provider_id);
CREATE INDEX IF NOT EXISTS idx_fhir_observations_code ON fhir_observations(observation_code);
CREATE INDEX IF NOT EXISTS idx_fhir_observations_effective ON fhir_observations(effective_datetime DESC);

-- FHIR Conditions (diagnoses, problems, health concerns)
CREATE TABLE IF NOT EXISTS fhir_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES user_profiles(id),
  appointment_id uuid REFERENCES appointments(id),

  condition_code text NOT NULL,
  condition_display text NOT NULL,
  icd10_code text,
  snomed_code text,

  clinical_status text DEFAULT 'active' CHECK (clinical_status IN ('active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved')),
  verification_status text DEFAULT 'confirmed' CHECK (verification_status IN ('unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted')),

  category text[] DEFAULT ARRAY['problem-list-item'],
  severity text CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),

  onset_datetime timestamptz,
  onset_age integer,
  abatement_datetime timestamptz,
  recorded_date timestamptz DEFAULT now(),

  body_site text,
  evidence jsonb,

  notes text,
  data_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_conditions_patient ON fhir_conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_conditions_provider ON fhir_conditions(provider_id);
CREATE INDEX IF NOT EXISTS idx_fhir_conditions_icd10 ON fhir_conditions(icd10_code);
CREATE INDEX IF NOT EXISTS idx_fhir_conditions_status ON fhir_conditions(clinical_status);

-- FHIR Medication Requests (prescriptions)
CREATE TABLE IF NOT EXISTS fhir_medication_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES user_profiles(id),
  appointment_id uuid REFERENCES appointments(id),

  medication_code text NOT NULL,
  medication_display text NOT NULL,
  din_number text,

  dosage_text text,
  dosage_quantity numeric,
  dosage_unit text,
  frequency text,
  route text,

  dosage_instructions jsonb,

  quantity_value numeric,
  quantity_unit text,
  supply_duration numeric,
  supply_duration_unit text DEFAULT 'days',

  number_of_refills integer DEFAULT 0,
  refills_remaining integer DEFAULT 0,

  status text DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft')),
  intent text DEFAULT 'order' CHECK (intent IN ('proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option')),

  reason_code text,
  reason_reference uuid,

  authored_on timestamptz DEFAULT now(),
  validity_period_start timestamptz,
  validity_period_end timestamptz,

  interactions_checked boolean DEFAULT false,
  interaction_warnings jsonb,
  allergy_warnings jsonb,

  notes text,
  data_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_med_requests_patient ON fhir_medication_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_med_requests_provider ON fhir_medication_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_fhir_med_requests_status ON fhir_medication_requests(status);
CREATE INDEX IF NOT EXISTS idx_fhir_med_requests_din ON fhir_medication_requests(din_number);

-- FHIR Procedures (treatments, interventions)
CREATE TABLE IF NOT EXISTS fhir_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES user_profiles(id),
  appointment_id uuid REFERENCES appointments(id),

  procedure_code text NOT NULL,
  procedure_display text NOT NULL,
  cpt_code text,
  snomed_code text,

  status text DEFAULT 'completed' CHECK (status IN ('preparation', 'in-progress', 'not-done', 'on-hold', 'stopped', 'completed', 'entered-in-error', 'unknown')),

  category text,

  performed_datetime timestamptz,
  performed_period_start timestamptz,
  performed_period_end timestamptz,

  body_site text,
  laterality text CHECK (laterality IN ('left', 'right', 'bilateral')),

  outcome text,
  complications text[],
  follow_up text[],

  report text,

  notes text,
  data_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_procedures_patient ON fhir_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_procedures_provider ON fhir_procedures(provider_id);
CREATE INDEX IF NOT EXISTS idx_fhir_procedures_code ON fhir_procedures(procedure_code);
CREATE INDEX IF NOT EXISTS idx_fhir_procedures_performed ON fhir_procedures(performed_datetime DESC);

-- FHIR Allergy Intolerances
CREATE TABLE IF NOT EXISTS fhir_allergy_intolerances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES user_profiles(id),

  allergen_code text NOT NULL,
  allergen_display text NOT NULL,

  allergy_type text DEFAULT 'allergy' CHECK (allergy_type IN ('allergy', 'intolerance')),
  category text[] DEFAULT ARRAY['medication'],

  criticality text CHECK (criticality IN ('low', 'high', 'unable-to-assess')),

  clinical_status text DEFAULT 'active' CHECK (clinical_status IN ('active', 'inactive', 'resolved')),
  verification_status text DEFAULT 'confirmed' CHECK (verification_status IN ('unconfirmed', 'confirmed', 'refuted')),

  reaction_manifestations jsonb,
  reaction_severity text CHECK (reaction_severity IN ('mild', 'moderate', 'severe')),
  reaction_description text,

  onset_datetime timestamptz,
  recorded_date timestamptz DEFAULT now(),

  notes text,
  data_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_allergies_patient ON fhir_allergy_intolerances(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_allergies_code ON fhir_allergy_intolerances(allergen_code);
CREATE INDEX IF NOT EXISTS idx_fhir_allergies_criticality ON fhir_allergy_intolerances(criticality);

-- =====================================================
-- CLINICAL TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS clinical_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('soap', 'dap', 'birp', 'consultation', 'procedure', 'discharge', 'progress')),
  specialty text,
  description text,

  template_sections jsonb NOT NULL,
  default_values jsonb,

  required_fields text[],
  field_validations jsonb,

  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,

  created_by uuid REFERENCES user_profiles(id),
  is_system_template boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_templates_type ON clinical_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_clinical_templates_specialty ON clinical_templates(specialty);
CREATE INDEX IF NOT EXISTS idx_clinical_templates_active ON clinical_templates(is_active);

CREATE TABLE IF NOT EXISTS icd10_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  category text,
  subcategory text,

  search_terms text[],
  commonly_used boolean DEFAULT false,

  version text DEFAULT '2024',
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icd10_code ON icd10_codes(code);
CREATE INDEX IF NOT EXISTS idx_icd10_description ON icd10_codes USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_icd10_common ON icd10_codes(commonly_used) WHERE commonly_used = true;

CREATE TABLE IF NOT EXISTS procedure_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  code_system text NOT NULL CHECK (code_system IN ('CPT', 'CCI', 'SNOMED')),
  description text NOT NULL,
  category text,

  typical_fee numeric(10, 2),
  relative_value_units numeric(8, 2),

  search_terms text[],
  commonly_used boolean DEFAULT false,

  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedure_code ON procedure_codes(code);
CREATE INDEX IF NOT EXISTS idx_procedure_system ON procedure_codes(code_system);
CREATE INDEX IF NOT EXISTS idx_procedure_description ON procedure_codes USING gin(to_tsvector('english', description));

-- =====================================================
-- STRUCTURED CLINICAL NOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS soap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES user_profiles(id),
  appointment_id uuid REFERENCES appointments(id),

  subjective text,
  objective text,
  assessment text,
  plan text,

  chief_complaint text,
  history_present_illness text,
  review_of_systems jsonb,
  physical_examination jsonb,
  diagnoses uuid[] DEFAULT ARRAY[]::uuid[],
  orders jsonb,

  follow_up_plan text,
  follow_up_date date,

  status text DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'amended', 'finalized')),
  signed_at timestamptz,

  data_hash text,
  signature_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soap_notes_patient ON soap_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_provider ON soap_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_appointment ON soap_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_status ON soap_notes(status);

CREATE TABLE IF NOT EXISTS consultation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referring_provider_id uuid REFERENCES user_profiles(id),
  consultant_provider_id uuid NOT NULL REFERENCES user_profiles(id),
  appointment_id uuid REFERENCES appointments(id),

  consultation_type text NOT NULL,
  reason_for_consultation text NOT NULL,

  history_summary text,
  clinical_findings text,
  diagnostic_impressions text,
  recommendations text,
  follow_up_instructions text,

  response_to_referral text,
  additional_workup_needed text,

  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged')),
  sent_date timestamptz,

  data_hash text,
  signature_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_patient ON consultation_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_consultant ON consultation_notes(consultant_provider_id);
CREATE INDEX IF NOT EXISTS idx_consultation_notes_referring ON consultation_notes(referring_provider_id);

CREATE TABLE IF NOT EXISTS procedure_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES user_profiles(id),
  procedure_id uuid REFERENCES fhir_procedures(id),

  pre_procedure_assessment text,
  indications text,
  contraindications_checked boolean DEFAULT false,
  consent_obtained boolean DEFAULT false,

  procedure_description text,
  technique_details text,
  findings text,
  specimens_collected text[],

  immediate_outcome text,
  complications text,
  post_procedure_instructions text,
  post_procedure_medications jsonb,

  status text DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'finalized')),

  data_hash text,
  signature_hash text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedure_notes_patient ON procedure_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedure_notes_provider ON procedure_notes(provider_id);

-- =====================================================
-- BLOCKCHAIN AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS blockchain_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  resource_type text NOT NULL,
  resource_id uuid NOT NULL,

  action text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'sign', 'share', 'export')),

  actor_id uuid NOT NULL REFERENCES user_profiles(id),
  actor_role text,
  actor_ip_address inet,

  data_before jsonb,
  data_after jsonb,

  data_hash text NOT NULL,
  previous_hash text,
  block_number bigint,
  blockchain_transaction_id text,

  timestamp timestamptz DEFAULT now() NOT NULL,

  reason text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON blockchain_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON blockchain_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON blockchain_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON blockchain_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash ON blockchain_audit_log(data_hash);

CREATE TABLE IF NOT EXISTS clinical_data_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,

  hash_algorithm text DEFAULT 'SHA-256',
  data_hash text NOT NULL,
  hash_timestamp timestamptz DEFAULT now() NOT NULL,

  verified boolean DEFAULT false,
  verification_timestamp timestamptz,
  tampered boolean DEFAULT false,

  UNIQUE(resource_type, resource_id, hash_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_data_hashes_resource ON clinical_data_hashes(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_hashes_timestamp ON clinical_data_hashes(hash_timestamp DESC);

CREATE TABLE IF NOT EXISTS provider_digital_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES user_profiles(id),

  resource_type text NOT NULL,
  resource_id uuid NOT NULL,

  signature_method text DEFAULT 'ECDSA',
  signature_data text NOT NULL,
  public_key text,

  attestation_text text,
  signature_timestamp timestamptz DEFAULT now() NOT NULL,

  is_valid boolean DEFAULT true,
  revoked boolean DEFAULT false,
  revoked_at timestamptz,
  revocation_reason text,

  UNIQUE(resource_type, resource_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_signatures_provider ON provider_digital_signatures(provider_id);
CREATE INDEX IF NOT EXISTS idx_signatures_resource ON provider_digital_signatures(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_signatures_timestamp ON provider_digital_signatures(signature_timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE fhir_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_medication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_allergy_intolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE icd10_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_data_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_digital_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own observations"
  ON fhir_observations FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view patient observations"
  ON fhir_observations FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id OR auth.uid() IN (
    SELECT provider_id FROM appointments WHERE patient_id = fhir_observations.patient_id
  ));

CREATE POLICY "Providers can create observations"
  ON fhir_observations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own observations"
  ON fhir_observations FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Patients can view own conditions"
  ON fhir_conditions FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can manage conditions"
  ON fhir_conditions FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id OR auth.uid() IN (
    SELECT provider_id FROM appointments WHERE patient_id = fhir_conditions.patient_id
  ))
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Patients can view own prescriptions"
  ON fhir_medication_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can manage prescriptions"
  ON fhir_medication_requests FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Authenticated users can view templates"
  ON clinical_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Providers can create templates"
  ON clinical_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can view ICD codes"
  ON icd10_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view procedure codes"
  ON procedure_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Patients can view own SOAP notes"
  ON soap_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Providers can manage own SOAP notes"
  ON soap_notes FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Users can view own audit records"
  ON blockchain_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = actor_id);

CREATE POLICY "System can insert audit records"
  ON blockchain_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "No one can delete audit records"
  ON blockchain_audit_log FOR DELETE
  TO authenticated
  USING (false);
