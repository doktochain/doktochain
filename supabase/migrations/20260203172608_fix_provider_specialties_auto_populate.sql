/*
  # Fix Provider Specialties Auto-Population

  1. Changes
    - Make specialty column nullable
    - Add trigger to auto-populate specialty name from specialties_master
    
  2. Notes
    - When specialty_id is provided, specialty name is fetched automatically
    - Backward compatible with direct specialty text entries
*/

-- Make specialty nullable
ALTER TABLE provider_specialties ALTER COLUMN specialty DROP NOT NULL;

-- Create function to auto-populate specialty name
CREATE OR REPLACE FUNCTION populate_specialty_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If specialty_id is provided but specialty is not, fetch the name
  IF NEW.specialty_id IS NOT NULL AND (NEW.specialty IS NULL OR NEW.specialty = '') THEN
    SELECT name INTO NEW.specialty
    FROM specialties_master
    WHERE id = NEW.specialty_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_populate_specialty_name ON provider_specialties;
CREATE TRIGGER trigger_populate_specialty_name
  BEFORE INSERT OR UPDATE ON provider_specialties
  FOR EACH ROW
  EXECUTE FUNCTION populate_specialty_name();