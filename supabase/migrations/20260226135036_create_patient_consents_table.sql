/*
  # Create Patient Consents Table

  1. New Tables
    - `patient_consents`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `provider_id` (uuid, references providers)
      - `consent_type` (text) - e.g., 'record_access', 'treatment', 'data_sharing'
      - `record_types` (text array) - which record types are shared
      - `start_date` (date) - when access starts
      - `end_date` (date, nullable) - when access expires (null = permanent)
      - `status` (text) - 'active', 'expired', 'revoked'
      - `revoked_at` (timestamptz, nullable) - when consent was revoked
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `patient_consents` table
    - Patients can manage their own consents
    - Providers can view consents granted to them
    - Admins can view all consents
*/

CREATE TABLE IF NOT EXISTS patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  consent_type text NOT NULL DEFAULT 'record_access',
  record_types text[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own consents"
  ON patient_consents FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can create consents"
  ON patient_consents FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update their own consents"
  ON patient_consents FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view consents granted to them"
  ON patient_consents FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all consents"
  ON patient_consents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
