/*
  # Add Policy Type and Province to Patient Insurance Cards

  1. Modified Tables
    - `patient_insurance_cards`
      - `policy_type` (text, nullable) - Whether this is a 'public' (provincial) or 'private' insurance policy
      - `province` (text, nullable) - Canadian province code for public/provincial insurance (e.g., ON, BC, QC)

  2. Notes
    - These fields allow consolidation of the insurance card and insurance policy forms
    - policy_type distinguishes provincial health cards from private insurance
    - province is only relevant when policy_type is 'public'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_insurance_cards' AND column_name = 'policy_type'
  ) THEN
    ALTER TABLE patient_insurance_cards ADD COLUMN policy_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_insurance_cards' AND column_name = 'province'
  ) THEN
    ALTER TABLE patient_insurance_cards ADD COLUMN province text;
  END IF;
END $$;