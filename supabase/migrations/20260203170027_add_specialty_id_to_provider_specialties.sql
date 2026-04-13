/*
  # Add specialty_id to provider_specialties table

  1. Changes
    - Add specialty_id column as foreign key to specialties_master
    - Keep existing specialty text column for backward compatibility
    
  2. Notes
    - Allows linking provider specialties to master specialty list
*/

-- Add specialty_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_specialties' AND column_name = 'specialty_id'
  ) THEN
    ALTER TABLE provider_specialties ADD COLUMN specialty_id uuid REFERENCES specialties_master(id);
    CREATE INDEX IF NOT EXISTS idx_provider_specialties_specialty_id ON provider_specialties(specialty_id);
  END IF;
  
  -- Add other missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_specialties' AND column_name = 'board_certified'
  ) THEN
    ALTER TABLE provider_specialties ADD COLUMN board_certified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_specialties' AND column_name = 'certification_year'
  ) THEN
    ALTER TABLE provider_specialties ADD COLUMN certification_year integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_specialties' AND column_name = 'certification_body'
  ) THEN
    ALTER TABLE provider_specialties ADD COLUMN certification_body text;
  END IF;
END $$;