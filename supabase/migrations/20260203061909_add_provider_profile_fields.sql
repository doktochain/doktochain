/*
  # Add Provider Profile Management Fields

  1. Changes
    - Add profile management fields to providers table
      - professional_photo_url
      - video_intro_url
      - virtual_consultation_fee_cents
      - slot_duration_minutes
      - max_daily_virtual_appointments
      - emergency_consultation_available
      - buffer_time_minutes
    - Rename accepts_new_patients to accepting_new_patients for consistency
    
  2. Notes
    - These fields support provider profile management features
*/

-- Add new fields to providers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'professional_photo_url'
  ) THEN
    ALTER TABLE providers ADD COLUMN professional_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'video_intro_url'
  ) THEN
    ALTER TABLE providers ADD COLUMN video_intro_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'virtual_consultation_fee_cents'
  ) THEN
    ALTER TABLE providers ADD COLUMN virtual_consultation_fee_cents integer DEFAULT 30000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'slot_duration_minutes'
  ) THEN
    ALTER TABLE providers ADD COLUMN slot_duration_minutes integer DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'max_daily_virtual_appointments'
  ) THEN
    ALTER TABLE providers ADD COLUMN max_daily_virtual_appointments integer DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'emergency_consultation_available'
  ) THEN
    ALTER TABLE providers ADD COLUMN emergency_consultation_available boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'buffer_time_minutes'
  ) THEN
    ALTER TABLE providers ADD COLUMN buffer_time_minutes integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'accepting_new_patients'
  ) THEN
    ALTER TABLE providers ADD COLUMN accepting_new_patients boolean DEFAULT true;
    -- Copy data from accepts_new_patients if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'providers' AND column_name = 'accepts_new_patients'
    ) THEN
      UPDATE providers SET accepting_new_patients = accepts_new_patients;
    END IF;
  END IF;
END $$;