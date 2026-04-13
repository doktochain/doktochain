/*
  # Enhanced Prescription Management Tables

  ## New Tables
    - prescription_validations - Drug interaction and validation checks
    - prescription_rejections - Rejection tracking
    - prescription_audit_log - Complete audit trail
*/

CREATE TABLE IF NOT EXISTS prescription_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id),
  validated_by uuid REFERENCES pharmacy_staff(id),
  validation_type text NOT NULL CHECK (validation_type IN ('drug-interaction', 'allergy-check', 'dosage-validation', 'duplicate-therapy', 'insurance-formulary')),
  validation_status text NOT NULL CHECK (validation_status IN ('passed', 'warning', 'failed')),
  validation_details jsonb,
  flags jsonb DEFAULT '[]'::jsonb,
  resolution_notes text,
  validated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescription_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id),
  rejected_by uuid REFERENCES pharmacy_staff(id),
  rejection_reason text NOT NULL CHECK (rejection_reason IN ('invalid-dosage', 'drug-interaction', 'allergy-conflict', 'illegible', 'missing-information', 'not-in-formulary', 'prior-authorization-required', 'other')),
  detailed_notes text NOT NULL,
  alternative_suggestions jsonb,
  provider_notified_at timestamptz,
  resolution_status text DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'cancelled')),
  resolved_at timestamptz,
  rejected_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescription_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id),
  staff_id uuid REFERENCES pharmacy_staff(id),
  action text NOT NULL CHECK (action IN ('received', 'validated', 'approved', 'rejected', 'modified', 'dispensed', 'refilled')),
  action_details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_validations_prescription_id ON prescription_validations(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_validations_pharmacy_id ON prescription_validations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_rejections_prescription_id ON prescription_rejections(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_audit_log_prescription_id ON prescription_audit_log(prescription_id);
