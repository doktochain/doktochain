/*
  # Admin & Staff Management System

  Tables for staff management, roles, permissions, and activity monitoring
*/

-- Staff Roles
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL,
  role_type text NOT NULL CHECK (role_type IN ('system', 'custom')),
  description text,
  is_system_role boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Staff Permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_name text UNIQUE NOT NULL,
  permission_category text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES staff_roles(id) ON DELETE CASCADE NOT NULL,
  permission_id uuid REFERENCES staff_permissions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(role_id, permission_id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_role_perms_role ON role_permissions(role_id);

-- Staff Members
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  role_id uuid REFERENCES staff_roles(id) NOT NULL,
  access_scope text DEFAULT 'all',
  can_access_phi boolean DEFAULT true,
  can_access_financial boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  hire_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_staff_provider ON staff_members(provider_id);
CREATE INDEX idx_staff_role ON staff_members(role_id);

-- Staff Activity Logs
CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  description text NOT NULL,
  patient_id uuid REFERENCES auth.users(id),
  ip_address text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_staff ON staff_activity_logs(staff_id);
CREATE INDEX idx_activity_date ON staff_activity_logs(created_at);

-- Staff Performance Metrics
CREATE TABLE IF NOT EXISTS staff_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_members(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  appointments_scheduled int DEFAULT 0,
  messages_sent int DEFAULT 0,
  payments_processed int DEFAULT 0,
  payment_amount_total decimal(10,2) DEFAULT 0,
  patient_satisfaction_score decimal(3,2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_performance_staff ON staff_performance_metrics(staff_id);

-- Enable RLS
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "roles_view" ON staff_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_manage" ON staff_roles FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "perms_view" ON staff_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_perms_view" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_perms_manage" ON role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "staff_view" ON staff_members FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "staff_manage" ON staff_members FOR ALL TO authenticated
  USING (provider_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "activity_view" ON staff_activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_create" ON staff_activity_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "metrics_view" ON staff_performance_metrics FOR SELECT TO authenticated USING (true);

-- Insert default roles
INSERT INTO staff_roles (role_name, role_type, description, is_system_role) VALUES
  ('admin', 'system', 'Full system access', true),
  ('office_manager', 'system', 'Full access except clinical notes', true),
  ('medical_assistant', 'system', 'Appointment management, vitals, messaging', true),
  ('receptionist', 'system', 'Appointment booking, check-in/out, billing', true),
  ('biller', 'system', 'Billing, insurance claims, financial reports', true),
  ('nurse', 'system', 'Clinical notes, prescriptions, telemedicine', true)
ON CONFLICT (role_name) DO NOTHING;

-- Insert default permissions
INSERT INTO staff_permissions (permission_name, permission_category, description) VALUES
  ('view_appointments', 'appointments', 'View appointment calendar'),
  ('create_appointments', 'appointments', 'Create new appointments'),
  ('edit_appointments', 'appointments', 'Edit existing appointments'),
  ('delete_appointments', 'appointments', 'Delete appointments'),
  ('access_patient_records', 'patients', 'Access patient information'),
  ('view_clinical_notes', 'clinical', 'View clinical documentation'),
  ('write_clinical_notes', 'clinical', 'Create/edit clinical notes'),
  ('write_prescriptions', 'clinical', 'Create prescriptions'),
  ('process_payments', 'billing', 'Process patient payments'),
  ('submit_insurance_claims', 'billing', 'Submit insurance claims'),
  ('view_financial_reports', 'billing', 'Access financial data'),
  ('manage_provider_schedule', 'admin', 'Manage provider availability'),
  ('send_patient_messages', 'messaging', 'Send messages to patients'),
  ('access_audit_logs', 'admin', 'View activity logs')
ON CONFLICT (permission_name) DO NOTHING;
