/*
  # Add pharmacy_id to patient_consents table

  1. Modified Tables
    - `patient_consents`
      - Add `pharmacy_id` (uuid, nullable) - references pharmacies for prescription data sharing
      - Make `provider_id` nullable to allow pharmacy-only consents

  2. Changes
    - provider_id becomes nullable so consent can be granted to a pharmacy without a provider
    - pharmacy_id added as a foreign key to pharmacies table
    - At least one of provider_id or pharmacy_id must be set (enforced by check constraint)

  3. Important Notes
    - No data is dropped or deleted
    - Existing records retain their provider_id values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_consents' AND column_name = 'pharmacy_id'
  ) THEN
    ALTER TABLE patient_consents ADD COLUMN pharmacy_id uuid REFERENCES pharmacies(id);
  END IF;
END $$;

ALTER TABLE patient_consents ALTER COLUMN provider_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_consents_grantee_check'
  ) THEN
    ALTER TABLE patient_consents
      ADD CONSTRAINT patient_consents_grantee_check
      CHECK (provider_id IS NOT NULL OR pharmacy_id IS NOT NULL);
  END IF;
END $$;
