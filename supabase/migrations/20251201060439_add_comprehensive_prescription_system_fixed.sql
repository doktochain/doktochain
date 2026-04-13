/*
  # Comprehensive Prescription Management System

  Complete prescription management with e-prescribing, pharmacy integration,
  and refill management
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drug Database
CREATE TABLE IF NOT EXISTS drug_database (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  din text UNIQUE,
  generic_name text NOT NULL,
  brand_names text[] DEFAULT '{}',
  drug_class text,
  controlled_substance_schedule text,
  dosage_forms jsonb DEFAULT '[]',
  available_strengths text[] DEFAULT '{}',
  typical_dosing jsonb DEFAULT '{}',
  cost_tier text DEFAULT 'generic',
  requires_prior_auth boolean DEFAULT false,
  pregnancy_category text,
  renal_adjustment boolean DEFAULT false,
  hepatic_adjustment boolean DEFAULT false,
  contraindications text[] DEFAULT '{}',
  black_box_warning text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_generic_name ON drug_database(generic_name);
CREATE INDEX IF NOT EXISTS idx_drug_din ON drug_database(din);

-- 2. Drug Interactions
CREATE TABLE IF NOT EXISTS drug_interactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_1_id uuid REFERENCES drug_database(id),
  drug_2_id uuid REFERENCES drug_database(id),
  severity text CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  description text NOT NULL,
  clinical_management text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(drug_1_id);

-- 3. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_number text UNIQUE NOT NULL DEFAULT 'RX-PENDING',
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  drug_id uuid REFERENCES drug_database(id),
  drug_name text NOT NULL,
  dosage_form text NOT NULL,
  strength text NOT NULL,
  quantity numeric NOT NULL,
  quantity_unit text NOT NULL,
  directions text NOT NULL,
  frequency text NOT NULL,
  duration_days integer,
  refills_authorized integer DEFAULT 0,
  refills_remaining integer DEFAULT 0,
  indication text,
  special_instructions text,
  daw boolean DEFAULT false,
  status text DEFAULT 'pending',
  priority text DEFAULT 'routine',
  prescribed_date date DEFAULT CURRENT_DATE,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  expiry_date date,
  is_controlled_substance boolean DEFAULT false,
  requires_monitoring boolean DEFAULT false,
  monitoring_instructions text,
  diagnosis_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider ON prescriptions(provider_id);

-- 4. Prescription Pharmacies
CREATE TABLE IF NOT EXISTS prescription_pharmacies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id uuid REFERENCES prescriptions(id) NOT NULL,
  pharmacy_id uuid REFERENCES pharmacies(id) NOT NULL,
  transmission_method text,
  transmitted_at timestamptz,
  transmission_status text DEFAULT 'pending',
  confirmation_number text,
  fax_number text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 5. Prescription Fills
CREATE TABLE IF NOT EXISTS prescription_fills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id uuid REFERENCES prescriptions(id) NOT NULL,
  pharmacy_id uuid REFERENCES pharmacies(id) NOT NULL,
  fill_number integer NOT NULL DEFAULT 0,
  quantity_dispensed numeric NOT NULL,
  days_supply integer,
  filled_date date DEFAULT CURRENT_DATE,
  picked_up_date date,
  pharmacist_id uuid REFERENCES user_profiles(id),
  ndc_code text,
  lot_number text,
  cost numeric,
  insurance_paid numeric,
  copay numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_fills_rx ON prescription_fills(prescription_id);

-- 6. Prescription Refill Requests
CREATE TABLE IF NOT EXISTS prescription_refill_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id uuid REFERENCES prescriptions(id) NOT NULL,
  patient_id uuid REFERENCES user_profiles(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  pharmacy_id uuid REFERENCES pharmacies(id),
  requested_by text,
  request_date timestamptz DEFAULT now(),
  reason text,
  days_since_last_fill integer,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  approval_notes text,
  denial_reason text,
  modifications jsonb,
  requires_appointment boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON prescription_refill_requests(status);
CREATE INDEX IF NOT EXISTS idx_refill_requests_provider ON prescription_refill_requests(provider_id);

-- 7. Pharmacy Communications
CREATE TABLE IF NOT EXISTS pharmacy_communications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id uuid REFERENCES prescriptions(id),
  pharmacy_id uuid REFERENCES pharmacies(id) NOT NULL,
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  sender_type text,
  sender_id uuid REFERENCES user_profiles(id) NOT NULL,
  message_type text,
  subject text NOT NULL,
  message text NOT NULL,
  requires_response boolean DEFAULT false,
  response_by_date date,
  parent_message_id uuid REFERENCES pharmacy_communications(id),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_comms_provider ON pharmacy_communications(provider_id);

-- 8. Prescription Safety Alerts
CREATE TABLE IF NOT EXISTS prescription_safety_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id uuid REFERENCES prescriptions(id) NOT NULL,
  alert_type text,
  severity text,
  alert_message text NOT NULL,
  clinical_guidance text,
  overridden boolean DEFAULT false,
  override_reason text,
  overridden_by uuid REFERENCES user_profiles(id),
  overridden_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 9. Prescription Audit Log
CREATE TABLE IF NOT EXISTS prescription_audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id uuid REFERENCES prescriptions(id) NOT NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES user_profiles(id) NOT NULL,
  user_type text,
  changes jsonb,
  reason text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- 10. Prescription Templates
CREATE TABLE IF NOT EXISTS prescription_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES user_profiles(id) NOT NULL,
  template_name text NOT NULL,
  drug_id uuid REFERENCES drug_database(id) NOT NULL,
  dosage_form text NOT NULL,
  strength text NOT NULL,
  quantity numeric NOT NULL,
  directions text NOT NULL,
  frequency text NOT NULL,
  duration_days integer,
  refills_authorized integer DEFAULT 0,
  special_instructions text,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Functions
CREATE SEQUENCE IF NOT EXISTS prescription_number_seq;

CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS text AS $$
BEGIN
  RETURN 'RX' || to_char(CURRENT_DATE, 'YY') || '-' || lpad(nextval('prescription_number_seq')::text, 8, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_prescription_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prescription_number = 'RX-PENDING' THEN
    NEW.prescription_number := generate_prescription_number();
  END IF;
  IF NEW.expiry_date IS NULL THEN
    IF NEW.is_controlled_substance THEN
      NEW.expiry_date := NEW.prescribed_date + INTERVAL '6 months';
    ELSE
      NEW.expiry_date := NEW.prescribed_date + INTERVAL '1 year';
    END IF;
  END IF;
  IF NEW.refills_remaining = 0 THEN
    NEW.refills_remaining := NEW.refills_authorized;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_prescription_defaults ON prescriptions;
CREATE TRIGGER trigger_set_prescription_defaults
  BEFORE INSERT ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_prescription_defaults();

-- RLS
ALTER TABLE drug_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_refill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read drugs" ON drug_database FOR SELECT TO authenticated USING (true);
CREATE POLICY "View own prescriptions" ON prescriptions FOR SELECT TO authenticated USING (provider_id = auth.uid() OR patient_id = auth.uid());
CREATE POLICY "Create prescriptions" ON prescriptions FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Update own prescriptions" ON prescriptions FOR UPDATE TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "View refill requests" ON prescription_refill_requests FOR SELECT TO authenticated USING (provider_id = auth.uid() OR patient_id = auth.uid());
CREATE POLICY "Create refill requests" ON prescription_refill_requests FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Update refill requests" ON prescription_refill_requests FOR UPDATE TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "View communications" ON pharmacy_communications FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "Create communications" ON pharmacy_communications FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "View fills" ON prescription_fills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM prescriptions WHERE prescriptions.id = prescription_fills.prescription_id AND (prescriptions.patient_id = auth.uid() OR prescriptions.provider_id = auth.uid())));
CREATE POLICY "Manage templates" ON prescription_templates FOR ALL TO authenticated USING (provider_id = auth.uid());
