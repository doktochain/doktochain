/*
  # Add profile_completed column to patients table

  1. Changes
    - Add `profile_completed` boolean column to `patients` table
    - Set default value to false
    - Set existing records to false

  2. Notes
    - This column tracks whether a patient has completed their profile onboarding
    - Used to show/hide the profile completion wizard in the patient dashboard
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE patients ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;
END $$;

UPDATE patients SET profile_completed = false WHERE profile_completed IS NULL;
