/*
  # Enhanced Family and Medication Management System

  1. New Tables
    - `medication_reminders` - Smart medication reminders
    - `medication_adherence_log` - Track medication taking
    - `insurance_policies` - Enhanced insurance management

  2. Updates to existing tables
    - Add fields to patients table for children
    - Add notification preferences

  3. Security
    - Enable RLS on all new tables
    - Add policies for family access
*/

-- Create medication_reminders table
CREATE TABLE IF NOT EXISTS medication_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'weekly', 'as_needed', 'custom')),
  reminder_times time[],
  days_of_week integer[],
  start_date date NOT NULL,
  end_date date,
  with_food boolean DEFAULT false,
  special_instructions text,
  enabled boolean DEFAULT true,
  snoozed_until timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own medication reminders"
  ON medication_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medication_reminders.patient_id
      AND patients.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM family_relationships fr
      JOIN patients p ON p.user_id = fr.child_user_id
      WHERE p.id = medication_reminders.patient_id
      AND fr.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can manage own medication reminders"
  ON medication_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medication_reminders.patient_id
      AND patients.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM family_relationships fr
      JOIN patients p ON p.user_id = fr.child_user_id
      WHERE p.id = medication_reminders.patient_id
      AND fr.parent_user_id = auth.uid()
    )
  );

-- Create medication_adherence_log table
CREATE TABLE IF NOT EXISTS medication_adherence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES medication_reminders(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  scheduled_time timestamptz NOT NULL,
  taken_time timestamptz,
  status text NOT NULL CHECK (status IN ('taken', 'missed', 'skipped', 'snoozed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medication_adherence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own adherence log"
  ON medication_adherence_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medication_adherence_log.patient_id
      AND patients.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM family_relationships fr
      JOIN patients p ON p.user_id = fr.child_user_id
      WHERE p.id = medication_adherence_log.patient_id
      AND fr.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can log adherence"
  ON medication_adherence_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medication_adherence_log.patient_id
      AND patients.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM family_relationships fr
      JOIN patients p ON p.user_id = fr.child_user_id
      WHERE p.id = medication_adherence_log.patient_id
      AND fr.parent_user_id = auth.uid()
    )
  );

-- Create insurance_policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  policy_type text NOT NULL CHECK (policy_type IN ('public', 'private')),
  provider_name text NOT NULL,
  policy_number text NOT NULL,
  group_number text,
  subscriber_name text,
  subscriber_relationship text,
  province text,
  coverage_type text CHECK (coverage_type IN ('individual', 'family', 'employee', 'dependent')),
  effective_date date NOT NULL,
  termination_date date,
  card_front_url text,
  card_back_url text,
  is_primary boolean DEFAULT false,
  coverage_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insurance policies"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own insurance policies"
  ON insurance_policies FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add fields to patients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'is_child'
  ) THEN
    ALTER TABLE patients ADD COLUMN is_child boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'parent_user_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN parent_user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE patients ADD COLUMN notification_preferences jsonb DEFAULT '{"push": true, "sms": true, "email": true}'::jsonb;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_medication_reminders_patient ON medication_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_enabled ON medication_reminders(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_medication_adherence_patient ON medication_adherence_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_reminder ON medication_adherence_log(reminder_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user ON insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_patient ON insurance_policies(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_primary ON insurance_policies(is_primary) WHERE is_primary = true;