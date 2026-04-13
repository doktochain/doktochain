/*
  # Add Admin CRUD Infrastructure

  1. New Tables
    - `admin_audit_log` - Track all admin CRUD operations
    - `admin_notes` - Internal admin notes on entities
    - `entity_status_history` - Track status changes
    - `clinic_locations` - Physical clinic locations
    - `medical_services` - Master list of services
    - `medical_assets` - Equipment and assets

  2. Modifications
    - Add soft delete columns to existing tables
    - Add indexes for admin queries

  3. Security
    - Enable RLS on all new tables
    - Add admin-only policies

  Note: provider_services and provider_locations already exist with different structure
*/

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin Notes
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  note_type text DEFAULT 'general',
  note_content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notes"
  ON admin_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Entity Status History
CREATE TABLE IF NOT EXISTS entity_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entity_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view status history"
  ON entity_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert status history"
  ON entity_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Clinic Locations
CREATE TABLE IF NOT EXISTS clinic_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  phone text,
  email text,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE clinic_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active locations"
  ON clinic_locations FOR SELECT
  TO authenticated
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage locations"
  ON clinic_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Medical Services (Master catalog)
CREATE TABLE IF NOT EXISTS medical_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_code text,
  description text,
  category text,
  duration_minutes integer DEFAULT 30,
  requires_lab_work boolean DEFAULT false,
  is_telemedicine_eligible boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE medical_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services"
  ON medical_services FOR SELECT
  TO authenticated
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage services"
  ON medical_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Medical Assets
CREATE TABLE IF NOT EXISTS medical_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name text NOT NULL,
  asset_type text NOT NULL,
  serial_number text,
  manufacturer text,
  model text,
  purchase_date date,
  warranty_expiry date,
  location_id uuid REFERENCES clinic_locations(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  last_maintenance date,
  next_maintenance date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE medical_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assets"
  ON medical_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Providers can view assets"
  ON medical_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'provider'
    )
    AND deleted_at IS NULL
  );

-- Add soft delete columns to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE providers ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE pharmacies ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notes_entity ON admin_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_pinned ON admin_notes(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_status_history_entity ON entity_status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON entity_status_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinic_locations_active ON clinic_locations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clinic_locations_deleted ON clinic_locations(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_medical_services_active ON medical_services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medical_services_category ON medical_services(category);

CREATE INDEX IF NOT EXISTS idx_medical_assets_location ON medical_assets(location_id);
CREATE INDEX IF NOT EXISTS idx_medical_assets_status ON medical_assets(status);

CREATE INDEX IF NOT EXISTS idx_providers_deleted ON providers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacies_deleted ON pharmacies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted ON user_profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_deleted ON appointments(deleted_at) WHERE deleted_at IS NULL;