/*
  # Add Clinical Note Attachments, Referral System, and Clinic Affiliation Fixes

  1. New Tables
    - `clinical_note_attachments`
      - `id` (uuid, primary key)
      - `clinical_note_id` (uuid, references soap_notes)
      - `file_url` (text, not null) - storage URL
      - `file_name` (text, not null) - original filename
      - `file_type` (text) - MIME type
      - `file_size` (integer) - size in bytes
      - `attachment_category` (text) - lab_result, imaging, referral_letter, consent_form, other
      - `uploaded_by` (uuid, references auth.users)
      - `created_at` (timestamptz)

    - `referrals`
      - `id` (uuid, primary key)
      - `referring_provider_id` (uuid, references providers)
      - `receiving_provider_id` (uuid, nullable, references providers) - null for external referrals
      - `patient_id` (uuid, references patients)
      - `referral_reason` (text) - reason for referral
      - `urgency` (text) - routine, urgent, emergent
      - `preferred_location_id` (uuid, nullable, references provider_locations)
      - `status` (text) - pending, accepted, declined, scheduled, completed, expired, cancelled
      - `clinical_note_id` (uuid, nullable, references soap_notes)
      - `external_provider_name` (text, nullable) - for external referrals
      - `external_provider_specialty` (text, nullable)
      - `external_provider_phone` (text, nullable)
      - `external_provider_fax` (text, nullable)
      - `external_provider_address` (text, nullable)
      - `referral_letter_url` (text, nullable) - generated PDF URL
      - `notes` (text, nullable)
      - `appointment_id` (uuid, nullable) - linked appointment when scheduled
      - `expires_at` (timestamptz, nullable)
      - `accepted_at` (timestamptz, nullable)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `provider_clinic_affiliations`
      - Added `clinic_entity_id` (uuid, nullable, references clinics) to properly link affiliations to clinic entities

  3. Security
    - RLS enabled on both new tables
    - `clinical_note_attachments`: providers can manage their own note attachments, patients can view attachments on their notes
    - `referrals`: referring providers, receiving providers, and patients can view their referrals; providers can manage referrals they created or received

  4. Important Notes
    - External referrals have `receiving_provider_id` as null and use the `external_provider_*` fields
    - The `clinic_entity_id` column is added to `provider_clinic_affiliations` to fix the mismatch between the service layer and database schema
*/

-- 1. Clinical Note Attachments
CREATE TABLE IF NOT EXISTS clinical_note_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_note_id uuid NOT NULL REFERENCES soap_notes(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text DEFAULT 'application/octet-stream',
  file_size integer DEFAULT 0,
  attachment_category text DEFAULT 'other',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinical_note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view attachments on their own notes"
  ON clinical_note_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM soap_notes
      WHERE soap_notes.id = clinical_note_attachments.clinical_note_id
      AND soap_notes.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert attachments on their own notes"
  ON clinical_note_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM soap_notes
      WHERE soap_notes.id = clinical_note_attachments.clinical_note_id
      AND soap_notes.provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete attachments they uploaded"
  ON clinical_note_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
  );

CREATE POLICY "Patients can view attachments on their own notes"
  ON clinical_note_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM soap_notes
      WHERE soap_notes.id = clinical_note_attachments.clinical_note_id
      AND soap_notes.patient_id = auth.uid()
    )
  );

-- 2. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_provider_id uuid NOT NULL REFERENCES providers(id),
  receiving_provider_id uuid REFERENCES providers(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  referral_reason text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT 'routine',
  preferred_location_id uuid REFERENCES provider_locations(id),
  status text NOT NULL DEFAULT 'pending',
  clinical_note_id uuid REFERENCES soap_notes(id),
  external_provider_name text,
  external_provider_specialty text,
  external_provider_phone text,
  external_provider_fax text,
  external_provider_address text,
  referral_letter_url text,
  notes text,
  appointment_id uuid REFERENCES appointments(id),
  expires_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referring providers can view their referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    referring_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Receiving providers can view referrals sent to them"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    receiving_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Referring providers can create referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    referring_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Referring providers can update their referrals"
  ON referrals
  FOR UPDATE
  TO authenticated
  USING (
    referring_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    referring_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Receiving providers can update referrals sent to them"
  ON referrals
  FOR UPDATE
  TO authenticated
  USING (
    receiving_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    receiving_provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- 3. Add clinic_entity_id to provider_clinic_affiliations if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_clinic_affiliations' AND column_name = 'clinic_entity_id'
  ) THEN
    ALTER TABLE provider_clinic_affiliations ADD COLUMN clinic_entity_id uuid REFERENCES clinics(id);
  END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinical_note_attachments_note_id ON clinical_note_attachments(clinical_note_id);
CREATE INDEX IF NOT EXISTS idx_clinical_note_attachments_uploaded_by ON clinical_note_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referring_provider ON referrals(referring_provider_id);
CREATE INDEX IF NOT EXISTS idx_referrals_receiving_provider ON referrals(receiving_provider_id);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_provider_clinic_affiliations_clinic_entity ON provider_clinic_affiliations(clinic_entity_id);
