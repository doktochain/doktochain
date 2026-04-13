/*
  # Add pharmacy onboarding status and provider clinic affiliations

  1. Modified Tables
    - `pharmacies`
      - Added `onboarding_status` column (text, default 'pending') to track approval workflow
      - Added `pharmacy_type` column (text) for retail/hospital/compounding classification
      - Added `description` column (text) for public-facing description
      - Added `rejection_reason` column (text) for admin denial notes
      - Added `admin_notes` column (text) for internal admin notes
      - Added `approved_by` column (uuid) referencing the admin who approved
      - Added `approved_at` column (timestamptz) for approval timestamp

  2. New Tables
    - `provider_clinic_affiliations`
      - Tracks which providers are affiliated with which clinics
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references providers)
      - `clinic_name` (text) - name of the clinic
      - `clinic_id` (uuid, nullable) - if the clinic is also a provider on the platform
      - `status` (text) - pending, active, rejected, left
      - `role_at_clinic` (text) - e.g. attending physician, consultant
      - `start_date` (date) - when affiliation began
      - `end_date` (date, nullable) - when affiliation ended
      - `requested_at` (timestamptz) - when affiliation was requested
      - `approved_at` (timestamptz, nullable) - when approved
      - `notes` (text, nullable)

  3. Security
    - RLS enabled on `provider_clinic_affiliations`
    - Providers can view and manage their own affiliations
    - Admins can view all affiliations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN onboarding_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'pharmacy_type'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN pharmacy_type text DEFAULT 'retail';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'description'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN admin_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN approved_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS provider_clinic_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  clinic_name text NOT NULL,
  clinic_id uuid REFERENCES providers(id),
  status text NOT NULL DEFAULT 'pending',
  role_at_clinic text DEFAULT 'attending_physician',
  start_date date,
  end_date date,
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE provider_clinic_affiliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own affiliations"
  ON provider_clinic_affiliations
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert own affiliations"
  ON provider_clinic_affiliations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own affiliations"
  ON provider_clinic_affiliations
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all affiliations"
  ON provider_clinic_affiliations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all affiliations"
  ON provider_clinic_affiliations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );