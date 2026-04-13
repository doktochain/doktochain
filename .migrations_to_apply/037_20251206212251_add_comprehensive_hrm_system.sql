/*
  # Comprehensive Human Resource Management System

  This migration creates a complete HRM system for managing staff, departments,
  attendance, leaves, payroll, and performance across the organization.

  ## New Tables

  ### 1. departments
  - `id` (uuid, primary key)
  - `name` (text) - Department name
  - `code` (text) - Unique department code
  - `description` (text) - Department description
  - `head_user_id` (uuid) - Department head reference
  - `parent_department_id` (uuid) - For hierarchical structure
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. designations
  - `id` (uuid, primary key)
  - `title` (text) - Job title
  - `code` (text) - Unique designation code
  - `department_id` (uuid) - Reference to department
  - `level` (text) - Job level (entry, mid, senior, executive)
  - `description` (text)
  - `responsibilities` (jsonb) - Array of responsibilities
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. staff_attendance
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to user_profiles
  - `date` (date) - Attendance date
  - `check_in` (timestamptz) - Clock in time
  - `check_out` (timestamptz) - Clock out time
  - `status` (text) - present, absent, half_day, late, on_leave
  - `work_hours` (numeric) - Calculated work hours
  - `overtime_hours` (numeric)
  - `notes` (text)
  - `location` (text) - Check-in location
  - `ip_address` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. leave_types
  - `id` (uuid, primary key)
  - `name` (text) - Leave type name
  - `code` (text) - Unique code
  - `description` (text)
  - `days_per_year` (integer) - Annual allocation
  - `is_paid` (boolean)
  - `requires_approval` (boolean)
  - `max_consecutive_days` (integer)
  - `can_carry_forward` (boolean)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. leave_balances
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to user_profiles
  - `leave_type_id` (uuid) - Reference to leave_types
  - `year` (integer) - Calendar year
  - `total_days` (numeric) - Total allocated
  - `used_days` (numeric) - Days used
  - `pending_days` (numeric) - Days in pending requests
  - `available_days` (numeric) - Available balance
  - `carried_forward` (numeric) - From previous year
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. leave_requests
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Employee requesting leave
  - `leave_type_id` (uuid) - Type of leave
  - `start_date` (date)
  - `end_date` (date)
  - `total_days` (numeric)
  - `reason` (text)
  - `status` (text) - pending, approved, rejected, cancelled
  - `approver_id` (uuid) - Manager who approved/rejected
  - `approval_notes` (text)
  - `approved_at` (timestamptz)
  - `attachments` (jsonb) - Supporting documents
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. holidays
  - `id` (uuid, primary key)
  - `name` (text) - Holiday name
  - `date` (date) - Holiday date
  - `type` (text) - public, optional, restricted
  - `description` (text)
  - `is_recurring` (boolean) - Annual recurrence
  - `applicable_locations` (jsonb) - Array of locations
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. salary_structures
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to user_profiles
  - `designation_id` (uuid) - Reference to designation
  - `base_salary` (numeric)
  - `currency` (text)
  - `pay_frequency` (text) - monthly, bi-weekly, weekly
  - `allowances` (jsonb) - Housing, transport, etc.
  - `deductions` (jsonb) - Tax, insurance, etc.
  - `effective_from` (date)
  - `effective_to` (date)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 9. payslips
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to user_profiles
  - `salary_structure_id` (uuid)
  - `pay_period_start` (date)
  - `pay_period_end` (date)
  - `base_salary` (numeric)
  - `gross_salary` (numeric)
  - `total_deductions` (numeric)
  - `net_salary` (numeric)
  - `allowances` (jsonb)
  - `deductions` (jsonb)
  - `bonuses` (jsonb)
  - `overtime_pay` (numeric)
  - `status` (text) - draft, approved, paid
  - `payment_date` (date)
  - `payment_method` (text)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 10. employee_documents
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to user_profiles
  - `document_type` (text) - contract, id, certificate, etc.
  - `document_name` (text)
  - `file_url` (text)
  - `file_size` (bigint)
  - `mime_type` (text)
  - `expiry_date` (date) - For documents that expire
  - `is_verified` (boolean)
  - `verified_by` (uuid)
  - `verified_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 11. performance_reviews
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Employee being reviewed
  - `reviewer_id` (uuid) - Manager conducting review
  - `review_period_start` (date)
  - `review_period_end` (date)
  - `overall_rating` (numeric) - 1-5 scale
  - `strengths` (text)
  - `areas_for_improvement` (text)
  - `goals` (jsonb) - Array of goals
  - `achievements` (jsonb)
  - `competencies` (jsonb) - Skills assessment
  - `status` (text) - draft, submitted, acknowledged
  - `acknowledgement_date` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for admin access
  - Policies for employee self-service
  - Policies for manager access to team data
*/

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  head_user_id uuid REFERENCES user_profiles(id),
  parent_department_id uuid REFERENCES departments(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_head_user ON departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

-- Designations table
CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  code text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  level text CHECK (level IN ('entry', 'mid', 'senior', 'executive', 'leadership')),
  description text,
  responsibilities jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designations_department ON designations(department_id);
CREATE INDEX IF NOT EXISTS idx_designations_level ON designations(level);
CREATE INDEX IF NOT EXISTS idx_designations_active ON designations(is_active);

-- Add department and designation to user_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'designation_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN designation_id uuid REFERENCES designations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN employee_id text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN join_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN employment_type text CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN manager_id uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Staff attendance table
CREATE TABLE IF NOT EXISTS staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'late', 'on_leave', 'holiday')),
  work_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  notes text,
  location text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_user ON staff_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status ON staff_attendance(status);

-- Leave types table
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  days_per_year integer DEFAULT 0,
  is_paid boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  max_consecutive_days integer,
  can_carry_forward boolean DEFAULT false,
  carry_forward_limit integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_types_active ON leave_types(is_active);

-- Leave balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  leave_type_id uuid REFERENCES leave_types(id) NOT NULL,
  year integer NOT NULL,
  total_days numeric DEFAULT 0,
  used_days numeric DEFAULT 0,
  pending_days numeric DEFAULT 0,
  available_days numeric DEFAULT 0,
  carried_forward numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  leave_type_id uuid REFERENCES leave_types(id) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id uuid REFERENCES user_profiles(id),
  approval_notes text,
  approved_at timestamptz,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  type text DEFAULT 'public' CHECK (type IN ('public', 'optional', 'restricted')),
  description text,
  is_recurring boolean DEFAULT false,
  applicable_locations jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_active ON holidays(is_active);

-- Salary structures table
CREATE TABLE IF NOT EXISTS salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  designation_id uuid REFERENCES designations(id),
  base_salary numeric NOT NULL,
  currency text DEFAULT 'USD',
  pay_frequency text DEFAULT 'monthly' CHECK (pay_frequency IN ('monthly', 'bi_weekly', 'weekly')),
  allowances jsonb DEFAULT '{}'::jsonb,
  deductions jsonb DEFAULT '{}'::jsonb,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_user ON salary_structures(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_active ON salary_structures(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_structures_dates ON salary_structures(effective_from, effective_to);

-- Payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  salary_structure_id uuid REFERENCES salary_structures(id),
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  base_salary numeric NOT NULL,
  gross_salary numeric NOT NULL,
  total_deductions numeric DEFAULT 0,
  net_salary numeric NOT NULL,
  allowances jsonb DEFAULT '{}'::jsonb,
  deductions jsonb DEFAULT '{}'::jsonb,
  bonuses jsonb DEFAULT '{}'::jsonb,
  overtime_pay numeric DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  payment_date date,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslips_user ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(status);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(pay_period_start, pay_period_end);

-- Employee documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('contract', 'id_proof', 'certificate', 'license', 'resume', 'other')),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  expiry_date date,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_user ON employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry ON employee_documents(expiry_date);

-- Performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  reviewer_id uuid REFERENCES user_profiles(id) NOT NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  overall_rating numeric CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths text,
  areas_for_improvement text,
  goals jsonb DEFAULT '[]'::jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  competencies jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  acknowledgement_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_user ON performance_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "All authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for designations
CREATE POLICY "Admins can manage designations"
  ON designations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "All authenticated users can view designations"
  ON designations FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for staff_attendance
CREATE POLICY "Admins can manage all attendance"
  ON staff_attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own attendance"
  ON staff_attendance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own attendance"
  ON staff_attendance FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attendance"
  ON staff_attendance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for leave_types
CREATE POLICY "Admins can manage leave types"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "All authenticated users can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for leave_balances
CREATE POLICY "Admins can manage all leave balances"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for leave_requests
CREATE POLICY "Admins can manage all leave requests"
  ON leave_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for holidays
CREATE POLICY "Admins can manage holidays"
  ON holidays FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "All authenticated users can view holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for salary_structures
CREATE POLICY "Admins can manage all salary structures"
  ON salary_structures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own salary structure"
  ON salary_structures FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for payslips
CREATE POLICY "Admins can manage all payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for employee_documents
CREATE POLICY "Admins can manage all employee documents"
  ON employee_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own documents"
  ON employee_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for performance_reviews
CREATE POLICY "Admins can manage all performance reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view own performance reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR reviewer_id = auth.uid());

-- Create function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours(check_in timestamptz, check_out timestamptz)
RETURNS numeric AS $$
BEGIN
  IF check_in IS NULL OR check_out IS NULL THEN
    RETURN 0;
  END IF;
  RETURN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600;
END;
$$ LANGUAGE plpgsql;

-- Create function to update leave balance after request approval
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE leave_balances
    SET 
      used_days = used_days + NEW.total_days,
      pending_days = pending_days - NEW.total_days,
      available_days = total_days - (used_days + NEW.total_days) - (pending_days - NEW.total_days),
      updated_at = now()
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    UPDATE leave_balances
    SET 
      pending_days = pending_days - NEW.total_days,
      available_days = total_days - used_days - (pending_days - NEW.total_days),
      updated_at = now()
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave balance updates
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_requests;
CREATE TRIGGER trigger_update_leave_balance
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_balance_on_approval();

-- Create function to reserve leave balance when request is created
CREATE OR REPLACE FUNCTION reserve_leave_balance_on_request()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leave_balances
  SET 
    pending_days = pending_days + NEW.total_days,
    available_days = total_days - used_days - (pending_days + NEW.total_days),
    updated_at = now()
  WHERE user_id = NEW.user_id 
    AND leave_type_id = NEW.leave_type_id 
    AND year = EXTRACT(YEAR FROM NEW.start_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave balance reservation
DROP TRIGGER IF EXISTS trigger_reserve_leave_balance ON leave_requests;
CREATE TRIGGER trigger_reserve_leave_balance
AFTER INSERT ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION reserve_leave_balance_on_request();

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers for all tables
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designations_updated_at ON designations;
CREATE TRIGGER update_designations_updated_at BEFORE UPDATE ON designations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_attendance_updated_at ON staff_attendance;
CREATE TRIGGER update_staff_attendance_updated_at BEFORE UPDATE ON staff_attendance
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_types_updated_at ON leave_types;
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salary_structures_updated_at ON salary_structures;
CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON salary_structures
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payslips_updated_at ON payslips;
CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON payslips
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_documents_updated_at ON employee_documents;
CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON employee_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_performance_reviews_updated_at ON performance_reviews;
CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();