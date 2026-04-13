/*
  # FHIR Interoperability System

  1. New Tables
    - fhir_endpoints - FHIR server endpoint configuration
    - fhir_resource_mappings - Internal to FHIR resource mappings
    - fhir_medication_requests - FHIR MedicationRequest resources
    - fhir_medication_dispenses - FHIR MedicationDispense resources
    - fhir_medication_knowledge - FHIR medication database
    - fhir_sync_logs - FHIR synchronization audit trail
    - provincial_ehr_integrations - Canadian provincial EHR systems

  2. Security
    - RLS enabled on all tables
    - Role-based access (admin, provider, pharmacy, patient)

  3. Features
    - FHIR R4 compliance
    - Provincial EHR integration
    - Comprehensive audit logging
*/

-- FHIR Endpoints
CREATE TABLE IF NOT EXISTS fhir_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_url text NOT NULL,
  fhir_version text DEFAULT 'R4',
  province text,
  authentication_type text DEFAULT 'oauth2',
  auth_config jsonb DEFAULT '{}',
  supported_resources text[] DEFAULT ARRAY['Patient', 'Practitioner', 'MedicationRequest', 'MedicationDispense'],
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
  last_sync_at timestamptz,
  sync_frequency_minutes integer DEFAULT 60,
  headers jsonb DEFAULT '{}',
  is_primary boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FHIR Resource Mappings
CREATE TABLE IF NOT EXISTS fhir_resource_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_table text NOT NULL,
  internal_field text NOT NULL,
  fhir_resource text NOT NULL,
  fhir_path text NOT NULL,
  transformation_rules jsonb DEFAULT '{}',
  is_bidirectional boolean DEFAULT true,
  is_required boolean DEFAULT false,
  data_type text,
  validation_rules jsonb DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(internal_table, internal_field, fhir_resource)
);

-- FHIR MedicationRequest
CREATE TABLE IF NOT EXISTS fhir_medication_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_id text UNIQUE NOT NULL,
  prescription_id uuid,
  status text NOT NULL,
  intent text DEFAULT 'order',
  priority text DEFAULT 'routine',
  medication_code_system text,
  medication_code text NOT NULL,
  medication_display text NOT NULL,
  patient_reference text NOT NULL,
  patient_id uuid,
  practitioner_reference text NOT NULL,
  provider_id uuid,
  authored_on timestamptz DEFAULT now(),
  dosage_instruction jsonb DEFAULT '[]',
  dispense_request jsonb DEFAULT '{}',
  substitution jsonb DEFAULT '{}',
  raw_fhir_resource jsonb NOT NULL,
  sync_status text DEFAULT 'pending',
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FHIR MedicationDispense
CREATE TABLE IF NOT EXISTS fhir_medication_dispenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_id text UNIQUE NOT NULL,
  medication_request_id uuid REFERENCES fhir_medication_requests(id),
  pharmacy_order_id uuid,
  status text NOT NULL,
  medication_code_system text,
  medication_code text NOT NULL,
  medication_display text NOT NULL,
  patient_reference text NOT NULL,
  patient_id uuid,
  performer_reference text NOT NULL,
  pharmacy_id uuid,
  quantity jsonb,
  days_supply integer,
  when_prepared timestamptz,
  when_handed_over timestamptz,
  dosage_instruction jsonb DEFAULT '[]',
  raw_fhir_resource jsonb NOT NULL,
  sync_status text DEFAULT 'pending',
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FHIR MedicationKnowledge
CREATE TABLE IF NOT EXISTS fhir_medication_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fhir_id text UNIQUE NOT NULL,
  code_system text DEFAULT 'http://www.nlm.nih.gov/research/umls/rxnorm',
  code text NOT NULL,
  display_name text NOT NULL,
  status text DEFAULT 'active',
  synonym text[],
  manufacturer text,
  dose_form text,
  amount jsonb,
  ingredient jsonb DEFAULT '[]',
  contraindication text[],
  regulatory_status text,
  monograph jsonb DEFAULT '{}',
  raw_fhir_resource jsonb NOT NULL,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- FHIR Sync Logs
CREATE TABLE IF NOT EXISTS fhir_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES fhir_endpoints(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  direction text NOT NULL,
  status text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  validation_errors jsonb,
  duration_ms integer,
  http_status_code integer,
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Provincial EHR Integrations
CREATE TABLE IF NOT EXISTS provincial_ehr_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text NOT NULL UNIQUE,
  system_name text NOT NULL,
  description text,
  fhir_endpoint_id uuid REFERENCES fhir_endpoints(id),
  is_enabled boolean DEFAULT false,
  credentials_encrypted text,
  api_key_encrypted text,
  oauth_config jsonb DEFAULT '{}',
  sync_enabled boolean DEFAULT false,
  last_successful_sync timestamptz,
  sync_schedule_cron text DEFAULT '0 * * * *',
  supported_operations text[] DEFAULT ARRAY['read', 'search'],
  rate_limit_per_hour integer DEFAULT 1000,
  timeout_seconds integer DEFAULT 30,
  retry_config jsonb DEFAULT '{"max_retries": 3, "backoff_seconds": 60}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fhir_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_resource_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_medication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_medication_dispenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_medication_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provincial_ehr_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_fhir_endpoints" ON fhir_endpoints FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "admin_resource_mappings" ON fhir_resource_mappings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "admin_provincial_ehr" ON provincial_ehr_integrations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "provider_view_med_requests" ON fhir_medication_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'provider'));

CREATE POLICY "provider_create_med_requests" ON fhir_medication_requests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'provider'));

CREATE POLICY "provider_update_med_requests" ON fhir_medication_requests FOR UPDATE TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "pharmacy_view_med_requests" ON fhir_medication_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'pharmacy'));

CREATE POLICY "pharmacy_manage_dispenses" ON fhir_medication_dispenses FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'pharmacy'));

CREATE POLICY "patient_view_med_requests" ON fhir_medication_requests FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "patient_view_dispenses" ON fhir_medication_dispenses FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "all_view_med_knowledge" ON fhir_medication_knowledge FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_med_knowledge" ON fhir_medication_knowledge FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "admin_view_sync_logs" ON fhir_sync_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "system_create_sync_logs" ON fhir_sync_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Seed Provincial EHR Systems
INSERT INTO provincial_ehr_integrations (province, system_name, description, is_enabled) VALUES
  ('ON', 'ConnectingOntario', 'Ontario Health Information Exchange', false),
  ('BC', 'CareConnect BC', 'BC Provincial Health Services', false),
  ('AB', 'Netcare Portal', 'Alberta Netcare Electronic Health Record', false),
  ('QC', 'DSQ (Dossier Santé Québec)', 'Quebec Provincial Health Record', false),
  ('MB', 'eChart Manitoba', 'Manitoba Electronic Health Record', false)
ON CONFLICT (province) DO NOTHING;
