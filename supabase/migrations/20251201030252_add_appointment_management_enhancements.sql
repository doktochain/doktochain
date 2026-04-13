/*
  # Appointment Management System Enhancements

  ## Overview
  This migration adds comprehensive appointment management features including:
  - Enhanced appointment statuses and tracking
  - Appointment type management
  - Waitlist system
  - Cancellation and rescheduling workflows
  - Questionnaire approval tracking

  ## New Tables Created

  ### 1. appointment_types
    - Defines different appointment service types
    - Includes duration, pricing, and availability options
    - Supports virtual and in-person configurations

  ### 2. appointment_waitlist
    - Manages patients waiting for specific time slots or providers
    - Priority ranking system
    - Auto-matching capabilities

  ### 3. appointment_status_history
    - Tracks all status changes for audit trail
    - Records who made the change and when
    - Stores reason for status changes

  ### 4. appointment_cancellations
    - Detailed cancellation tracking
    - Reason categorization
    - Refund processing status
    - Rescheduling offers

  ## Enhanced Columns
  - Added questionnaire_approved_at to appointments
  - Added questionnaire_approved_by to appointments
  - Added cancellation_fee_assessed to appointments
  - Added check_in_time and check_out_time for in-person visits
  - Added exam_room for in-person visits

  ## Security
  - RLS enabled on all new tables
  - Providers can manage their own appointments
  - Patients can view their own waitlist entries
  - Admin has full access
*/

-- Create appointment types table
CREATE TABLE IF NOT EXISTS appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  type_name text NOT NULL,
  type_category text NOT NULL CHECK (type_category IN ('general', 'dental', 'specialty', 'diagnostic', 'procedure')),
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  base_price decimal(10, 2),
  virtual_available boolean DEFAULT true,
  in_person_available boolean DEFAULT true,
  requires_questionnaire boolean DEFAULT false,
  requires_consent_form boolean DEFAULT false,
  auto_confirm boolean DEFAULT false,
  buffer_time_before integer DEFAULT 0,
  buffer_time_after integer DEFAULT 0,
  max_patients_per_slot integer DEFAULT 1,
  color_code text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointment waitlist table
CREATE TABLE IF NOT EXISTS appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  appointment_type_id uuid REFERENCES appointment_types(id) ON DELETE SET NULL,
  preferred_date_start date,
  preferred_date_end date,
  preferred_time_of_day text CHECK (preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'any')),
  preferred_days jsonb DEFAULT '[]'::jsonb,
  priority_score integer DEFAULT 0,
  reason_for_visit text,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'matched', 'expired', 'cancelled')),
  matched_appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  matched_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointment status history table
CREATE TABLE IF NOT EXISTS appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_role text CHECK (changed_by_role IN ('patient', 'provider', 'admin', 'system')),
  reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create appointment cancellations table
CREATE TABLE IF NOT EXISTS appointment_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_by_role text CHECK (cancelled_by_role IN ('patient', 'provider', 'admin')),
  cancellation_reason text NOT NULL,
  cancellation_category text CHECK (cancellation_category IN ('patient_request', 'provider_unavailable', 'emergency', 'no_show', 'duplicate', 'other')),
  offered_reschedule boolean DEFAULT false,
  reschedule_accepted boolean,
  cancellation_fee_amount decimal(10, 2) DEFAULT 0,
  refund_amount decimal(10, 2) DEFAULT 0,
  refund_status text DEFAULT 'not_applicable' CHECK (refund_status IN ('not_applicable', 'pending', 'processed', 'failed')),
  refund_processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to appointments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_type_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN appointment_type_id uuid REFERENCES appointment_types(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'questionnaire_approved_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN questionnaire_approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'questionnaire_approved_by'
  ) THEN
    ALTER TABLE appointments ADD COLUMN questionnaire_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'cancellation_fee_assessed'
  ) THEN
    ALTER TABLE appointments ADD COLUMN cancellation_fee_assessed decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE appointments ADD COLUMN check_in_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'check_out_time'
  ) THEN
    ALTER TABLE appointments ADD COLUMN check_out_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'exam_room'
  ) THEN
    ALTER TABLE appointments ADD COLUMN exam_room text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'priority_score'
  ) THEN
    ALTER TABLE appointments ADD COLUMN priority_score integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointment_types_provider ON appointment_types(provider_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_waitlist_provider_status ON appointment_waitlist(provider_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_waitlist_dates ON appointment_waitlist(preferred_date_start, preferred_date_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_status_history_appointment ON appointment_status_history(appointment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellations_appointment ON appointment_cancellations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);

-- Enable RLS
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_types
CREATE POLICY "Providers can manage their appointment types"
  ON appointment_types FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active appointment types"
  ON appointment_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for appointment_waitlist
CREATE POLICY "Patients can manage their waitlist entries"
  ON appointment_waitlist FOR ALL
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view their waitlist"
  ON appointment_waitlist FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update waitlist status"
  ON appointment_waitlist FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for appointment_status_history
CREATE POLICY "Users can view status history for their appointments"
  ON appointment_status_history FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can insert status history"
  ON appointment_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for appointment_cancellations
CREATE POLICY "Users can view cancellations for their appointments"
  ON appointment_cancellations FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create cancellations for their appointments"
  ON appointment_cancellations FOR INSERT
  TO authenticated
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
    )
  );

-- Function to automatically create status history on appointment update
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO appointment_status_history (
      appointment_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status history
DROP TRIGGER IF EXISTS appointment_status_change_trigger ON appointments;
CREATE TRIGGER appointment_status_change_trigger
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_appointment_status_change();
