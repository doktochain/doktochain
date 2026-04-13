/*
  # Fix Provider Procedures Trigger with Correct Columns

  1. Changes
    - Update trigger to use correct column names from procedures_master
    - Map: name, description, average_duration_minutes, typical_cost
    
  2. Notes
    - Allows provider customization of values
*/

-- Update function with correct column mappings
CREATE OR REPLACE FUNCTION populate_procedure_details()
RETURNS TRIGGER AS $$
DECLARE
  v_name text;
  v_description text;
  v_duration int;
  v_cost_min numeric;
  v_cost_max numeric;
  v_avg_cost int;
BEGIN
  -- If procedure_id is provided, fetch details from master
  IF NEW.procedure_id IS NOT NULL THEN
    SELECT 
      name,
      description,
      average_duration_minutes,
      typical_cost_min,
      typical_cost_max
    INTO 
      v_name,
      v_description,
      v_duration,
      v_cost_min,
      v_cost_max
    FROM procedures_master
    WHERE id = NEW.procedure_id;
    
    -- Always populate procedure_name from master
    NEW.procedure_name := v_name;
    
    -- Populate description if not provided
    IF NEW.description IS NULL OR NEW.description = '' THEN
      NEW.description := v_description;
    END IF;
    
    -- Populate duration if not provided or zero
    IF NEW.duration_minutes IS NULL OR NEW.duration_minutes = 0 THEN
      NEW.duration_minutes := COALESCE(v_duration, 30);
    END IF;
    
    -- Calculate average cost and populate if not provided
    IF NEW.price_cents IS NULL OR NEW.price_cents = 0 THEN
      IF v_cost_min IS NOT NULL AND v_cost_max IS NOT NULL THEN
        v_avg_cost := ROUND(((v_cost_min + v_cost_max) / 2) * 100);
        NEW.price_cents := v_avg_cost;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;