/*
  # Add Dual Consent Model (Appointment-Scoped + Broad)

  1. Modified Tables
    - `patient_consents` - adds new columns for dual consent model:
      - `consent_scope` (text) - 'appointment' or 'broad', defaults to 'broad'
      - `appointment_id` (uuid, nullable) - links to appointments table for appointment-scoped consents
      - `access_start` (timestamptz) - precise start of access window (appointment-scoped)
      - `access_end` (timestamptz) - precise end of access window (appointment-scoped)

  2. Security
    - Updated `has_active_consent` helper function to support dual consent model
    - Checks both appointment-scoped windows (timestamptz precision) and broad consents (date precision)
    - Pharmacy consents continue to work unchanged

  3. Important Notes
    - Appointment-scoped consents are auto-created when a patient books an appointment
    - Access window: 20 minutes before appointment start to 20 minutes after end
    - Broad consents are patient-initiated for longer-term provider access
    - Both coexist: if either is active, provider has access
    - Patient can revoke either type at any time
    - CHECK constraint ensures appointment-scoped consents always have appointment_id and access times
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_consents' AND column_name = 'consent_scope'
  ) THEN
    ALTER TABLE patient_consents ADD COLUMN consent_scope text NOT NULL DEFAULT 'broad';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_consents' AND column_name = 'appointment_id'
  ) THEN
    ALTER TABLE patient_consents ADD COLUMN appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_consents' AND column_name = 'access_start'
  ) THEN
    ALTER TABLE patient_consents ADD COLUMN access_start timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_consents' AND column_name = 'access_end'
  ) THEN
    ALTER TABLE patient_consents ADD COLUMN access_end timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_appointment_scope_fields'
  ) THEN
    ALTER TABLE patient_consents ADD CONSTRAINT chk_appointment_scope_fields
      CHECK (
        consent_scope = 'broad'
        OR (consent_scope = 'appointment' AND appointment_id IS NOT NULL AND access_start IS NOT NULL AND access_end IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_patient_consents_appointment_id'
  ) THEN
    CREATE INDEX idx_patient_consents_appointment_id ON patient_consents(appointment_id) WHERE appointment_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_patient_consents_active_window'
  ) THEN
    CREATE INDEX idx_patient_consents_active_window ON patient_consents(provider_id, patient_id, status, consent_scope);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION has_active_consent(
  p_patient_id uuid,
  p_provider_id uuid,
  p_record_type text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id
      AND provider_id = p_provider_id
      AND status = 'active'
      AND (
        (
          consent_scope = 'appointment'
          AND access_start <= NOW()
          AND access_end >= NOW()
        )
        OR
        (
          consent_scope = 'broad'
          AND start_date <= CURRENT_DATE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        )
      )
      AND (
        p_record_type IS NULL
        OR record_types = '{}'
        OR p_record_type = ANY(record_types)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
