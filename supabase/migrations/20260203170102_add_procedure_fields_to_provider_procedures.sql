/*
  # Add Procedure Fields to provider_procedures

  1. Changes
    - Add procedure_name, description, price_cents, duration_minutes, 
      requires_referral, available_virtually fields to provider_procedures
    - These allow providers to customize procedures or add custom ones
    
  2. Notes
    - Supports both linked procedures (via procedure_id) and custom procedures
*/

-- Add fields to provider_procedures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_procedures' AND column_name = 'procedure_name'
  ) THEN
    ALTER TABLE provider_procedures ADD COLUMN procedure_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_procedures' AND column_name = 'description'
  ) THEN
    ALTER TABLE provider_procedures ADD COLUMN description text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_procedures' AND column_name = 'price_cents'
  ) THEN
    ALTER TABLE provider_procedures ADD COLUMN price_cents integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_procedures' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE provider_procedures ADD COLUMN duration_minutes integer DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_procedures' AND column_name = 'requires_referral'
  ) THEN
    ALTER TABLE provider_procedures ADD COLUMN requires_referral boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_procedures' AND column_name = 'available_virtually'
  ) THEN
    ALTER TABLE provider_procedures ADD COLUMN available_virtually boolean DEFAULT false;
  END IF;
END $$;