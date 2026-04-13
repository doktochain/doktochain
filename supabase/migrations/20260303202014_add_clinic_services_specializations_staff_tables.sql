/*
  # Add Clinic Services, Specializations, Staff, and Patient Access Tables

  1. New Tables
    - `clinic_services` - Links clinics to medical_services they offer (activate/deactivate)
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, references clinics)
      - `service_id` (uuid, references medical_services)
      - `is_active` (boolean, default true)
      - `custom_price` (decimal, optional clinic-specific price override)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `clinic_specializations` - Links clinics to specialties_master they support
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, references clinics)
      - `specialty_id` (uuid, references specialties_master)
      - `is_active` (boolean, default true)
      - `provider_count` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `clinic_staff` - Staff members for clinic operations
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, references clinics)
      - `user_id` (uuid, references auth.users - nullable for invited staff)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text, nullable)
      - `role` (text - receptionist, nurse, admin, billing, lab_tech, etc.)
      - `department` (text, nullable)
      - `status` (text - active, inactive, suspended)
      - `is_on_duty` (boolean, default false)
      - `duty_start_time` (time, nullable)
      - `duty_end_time` (time, nullable)
      - `duty_days` (integer array - 0=Sun through 6=Sat)
      - `last_login_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `clinic_staff_activity_log` - Tracks all staff actions for audit
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, references clinics)
      - `staff_id` (uuid, references clinic_staff)
      - `action_type` (text - login, logout, view_patient, edit_record, etc.)
      - `action_description` (text)
      - `resource_type` (text, nullable - patient, appointment, etc.)
      - `resource_id` (uuid, nullable)
      - `ip_address` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Clinic owners can manage their own clinic's services, specializations, staff
    - Staff can read their own clinic data
    - Activity logs are append-only (insert only by system, read by clinic owners)
*/

-- clinic_services table
CREATE TABLE IF NOT EXISTS clinic_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES medical_services(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  custom_price decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, service_id)
);

ALTER TABLE clinic_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can manage their services"
  ON clinic_services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_services.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_services.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

-- clinic_specializations table
CREATE TABLE IF NOT EXISTS clinic_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES specialties_master(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  provider_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, specialty_id)
);

ALTER TABLE clinic_specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can manage their specializations"
  ON clinic_specializations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_specializations.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_specializations.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

-- clinic_staff table
CREATE TABLE IF NOT EXISTS clinic_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'receptionist',
  department text,
  status text NOT NULL DEFAULT 'active',
  is_on_duty boolean NOT NULL DEFAULT false,
  duty_start_time time,
  duty_end_time time,
  duty_days integer[] DEFAULT '{1,2,3,4,5}',
  last_login_at timestamptz,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clinic_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can manage their staff"
  ON clinic_staff
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can read own clinic staff list"
  ON clinic_staff
  FOR SELECT
  TO authenticated
  USING (
    clinic_staff.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.clinic_id = clinic_staff.clinic_id
      AND cs.user_id = auth.uid()
      AND cs.status = 'active'
    )
  );

-- clinic_staff_activity_log table
CREATE TABLE IF NOT EXISTS clinic_staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES clinic_staff(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_description text NOT NULL DEFAULT '',
  resource_type text,
  resource_id uuid,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinic_staff_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can read activity logs"
  ON clinic_staff_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff_activity_log.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON clinic_staff_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_staff_activity_log.clinic_id
      AND clinics.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM clinic_staff
      WHERE clinic_staff.id = clinic_staff_activity_log.staff_id
      AND clinic_staff.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_services_clinic_id ON clinic_services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_services_service_id ON clinic_services(service_id);
CREATE INDEX IF NOT EXISTS idx_clinic_specializations_clinic_id ON clinic_specializations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_specializations_specialty_id ON clinic_specializations(specialty_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_clinic_id ON clinic_staff(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_user_id ON clinic_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_activity_log_clinic_id ON clinic_staff_activity_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_activity_log_staff_id ON clinic_staff_activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_activity_log_created_at ON clinic_staff_activity_log(created_at);
