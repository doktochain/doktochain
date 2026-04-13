/*
  # Create missing clinical and pharmacy tables

  1. New Tables
    - `consent_forms` - Tracks patient consent form acknowledgments during booking
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references appointments)
      - `form_type` (text)
      - `acknowledged_at` (timestamptz)

    - `medication_logs` - Tracks medication adherence (taken/missed/skipped)
      - `id` (uuid, primary key)
      - `patient_medication_id` (uuid, references patient_medications)
      - `patient_id` (uuid, references patients)
      - `reminder_id` (uuid)
      - `scheduled_time` (timestamptz)
      - `taken_time` (timestamptz)
      - `status` (text)
      - `notes` (text)

    - `pharmacy_operating_hours` - Pharmacy business hours by day of week
      - `id` (uuid, primary key)
      - `pharmacy_id` (uuid, references pharmacies)
      - `day_of_week` (integer, 0-6)
      - `open_time` (time)
      - `close_time` (time)
      - `is_closed` (boolean)

    - `provider_insurances` - Insurance plans accepted by providers
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references providers)
      - `insurance_provider` (text)
      - `insurance_plan_name` (text)
      - `is_active` (boolean)

  2. Security
    - Enable RLS on all tables
    - Role-based policies for each table
*/

-- consent_forms
CREATE TABLE IF NOT EXISTS consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  form_type text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own consent forms"
  ON consent_forms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = consent_forms.appointment_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Patients can create consent forms"
  ON consent_forms FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = consent_forms.appointment_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view consent forms for their appointments"
  ON consent_forms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a
    JOIN providers pv ON pv.id = a.provider_id
    WHERE a.id = consent_forms.appointment_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all consent forms"
  ON consent_forms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- medication_logs
CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_medication_id uuid NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reminder_id uuid,
  scheduled_time timestamptz NOT NULL,
  taken_time timestamptz,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own medication logs"
  ON medication_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = medication_logs.patient_id
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own medication logs"
  ON medication_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = medication_logs.patient_id
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Patients can update own medication logs"
  ON medication_logs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = medication_logs.patient_id
    AND patients.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = medication_logs.patient_id
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view patient medication logs with consent"
  ON medication_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patient_consents pc
    JOIN providers pv ON pv.id = pc.provider_id
    WHERE pc.patient_id = medication_logs.patient_id
    AND pv.user_id = auth.uid()
    AND pc.status = 'active'
    AND pc.start_date <= now()
    AND (pc.end_date IS NULL OR pc.end_date >= now())
  ));

-- pharmacy_operating_hours
CREATE TABLE IF NOT EXISTS pharmacy_operating_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_operating_hours_unique UNIQUE (pharmacy_id, day_of_week)
);

ALTER TABLE pharmacy_operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active pharmacy hours"
  ON pharmacy_operating_hours FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = pharmacy_operating_hours.pharmacy_id
    AND pharmacies.is_active = true
  ));

CREATE POLICY "Pharmacy owners can insert hours"
  ON pharmacy_operating_hours FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = pharmacy_operating_hours.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update hours"
  ON pharmacy_operating_hours FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = pharmacy_operating_hours.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = pharmacy_operating_hours.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can delete hours"
  ON pharmacy_operating_hours FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = pharmacy_operating_hours.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all pharmacy hours"
  ON pharmacy_operating_hours FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- provider_insurances
CREATE TABLE IF NOT EXISTS provider_insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  insurance_provider text NOT NULL,
  insurance_plan_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active provider insurances"
  ON provider_insurances FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Providers can insert own insurances"
  ON provider_insurances FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_insurances.provider_id
    AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own insurances"
  ON provider_insurances FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_insurances.provider_id
    AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_insurances.provider_id
    AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can delete own insurances"
  ON provider_insurances FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_insurances.provider_id
    AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all provider insurances"
  ON provider_insurances FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));
