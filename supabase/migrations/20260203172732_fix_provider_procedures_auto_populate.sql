/*
  # Fix Provider Procedures Auto-Population

  1. Changes
    - Make procedure_name nullable
    - Add trigger to auto-populate procedure details from procedures_master
    
  2. Notes
    - When procedure_id is provided, procedure details are fetched automatically
    - Supports custom procedures with direct entry
*/

-- Make procedure_name nullable if not already
DO $$
BEGIN
  ALTER TABLE provider_procedures ALTER COLUMN procedure_name DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create function to auto-populate procedure details
CREATE OR REPLACE FUNCTION populate_procedure_details()
RETURNS TRIGGER AS $$
BEGIN
  -- If procedure_id is provided, fetch details from master
  IF NEW.procedure_id IS NOT NULL THEN
    SELECT 
      name,
      description,
      average_cost_cents,
      typical_duration_minutes,
      requires_referral,
      available_virtually
    INTO 
      NEW.procedure_name,
      NEW.description,
      NEW.price_cents,
      NEW.duration_minutes,
      NEW.requires_referral,
      NEW.available_virtually
    FROM procedures_master
    WHERE id = NEW.procedure_id;
    
    -- If user provided custom values, keep those
    IF NEW.price_cents IS NULL OR NEW.price_cents = 0 THEN
      SELECT average_cost_cents INTO NEW.price_cents
      FROM procedures_master
      WHERE id = NEW.procedure_id;
    END IF;
    
    IF NEW.duration_minutes IS NULL OR NEW.duration_minutes = 0 THEN
      SELECT typical_duration_minutes INTO NEW.duration_minutes
      FROM procedures_master
      WHERE id = NEW.procedure_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_populate_procedure_details ON provider_procedures;
CREATE TRIGGER trigger_populate_procedure_details
  BEFORE INSERT OR UPDATE ON provider_procedures
  FOR EACH ROW
  EXECUTE FUNCTION populate_procedure_details();