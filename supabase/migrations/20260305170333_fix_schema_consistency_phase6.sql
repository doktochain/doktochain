/*
  # Schema Consistency Fixes - Phase 6

  1. Modified Tables
    - `blockchain_audit_log`: Add columns expected by blockchainAuditService
      - `event_type` (text) - maps to action type category
      - `current_hash` (text) - alias for data_hash used by service
      - `action_data` (jsonb) - structured action payload
      - `ip_address` (text) - simpler IP storage
      - `user_agent` (text) - browser user agent
      - `verified` (boolean) - verification status
      - `tamper_detected` (boolean) - tamper detection flag
    - `prescriptions`: Add `approved_at`, `approved_by` for pharmacy approval flow
    - `clinical_notes`: Add `vital_signs` column for vitals data
    - `provider_specialties`: Add `special_interests` for provider profile
    - `prescription_audit_log`: Add `pharmacy_id`, `staff_id`, `action_details` for pharmacy audit
    - `pharmacy_communications`: Make columns nullable and add missing ones
    - `prescription_refill_requests`: Add `approved_by`, `approved_at`, `denial_reason`

  2. Important Notes
    - These changes align the database schema with the application service layer
    - All new columns are nullable to avoid breaking existing data
    - No existing columns are removed or modified
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'event_type') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN event_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'current_hash') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN current_hash text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'action_data') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN action_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'ip_address') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN ip_address text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'user_agent') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN user_agent text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'verified') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blockchain_audit_log' AND column_name = 'tamper_detected') THEN
    ALTER TABLE blockchain_audit_log ADD COLUMN tamper_detected boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'approved_at') THEN
    ALTER TABLE prescriptions ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'approved_by') THEN
    ALTER TABLE prescriptions ADD COLUMN approved_by uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_notes' AND column_name = 'vital_signs') THEN
    ALTER TABLE clinical_notes ADD COLUMN vital_signs jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_specialties' AND column_name = 'special_interests') THEN
    ALTER TABLE provider_specialties ADD COLUMN special_interests text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescription_audit_log' AND column_name = 'pharmacy_id') THEN
    ALTER TABLE prescription_audit_log ADD COLUMN pharmacy_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescription_audit_log' AND column_name = 'staff_id') THEN
    ALTER TABLE prescription_audit_log ADD COLUMN staff_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescription_audit_log' AND column_name = 'action_details') THEN
    ALTER TABLE prescription_audit_log ADD COLUMN action_details jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_communications' AND column_name = 'communication_type') THEN
    ALTER TABLE pharmacy_communications ADD COLUMN communication_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_communications' AND column_name = 'status') THEN
    ALTER TABLE pharmacy_communications ADD COLUMN status text DEFAULT 'sent';
  END IF;
END $$;

ALTER TABLE pharmacy_communications ALTER COLUMN provider_id DROP NOT NULL;
ALTER TABLE pharmacy_communications ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE pharmacy_communications ALTER COLUMN subject DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescription_refill_requests' AND column_name = 'approved_by') THEN
    ALTER TABLE prescription_refill_requests ADD COLUMN approved_by uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescription_refill_requests' AND column_name = 'approved_at') THEN
    ALTER TABLE prescription_refill_requests ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescription_refill_requests' AND column_name = 'denial_reason') THEN
    ALTER TABLE prescription_refill_requests ADD COLUMN denial_reason text;
  END IF;
END $$;