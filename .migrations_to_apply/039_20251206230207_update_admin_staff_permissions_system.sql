/*
  # Update Admin Staff Permissions System

  1. Schema Updates
    - Add `role_type` to custom_roles (admin_staff or system)
    - Add `resource_path` to role_permissions for URL matching
    - Add `resource_category` to role_permissions for grouping
    - Add `parent_resource` to role_permissions for menu hierarchy
    
  2. New Function
    - Create `check_user_permission` function for fast permission lookups
    
  3. Indexes
    - Add indexes for better query performance
    
  4. Seed Data
    - Add sample staff roles (Receptionist, HR Manager, etc.)
*/

-- Add new columns to custom_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_roles' AND column_name = 'role_type'
  ) THEN
    ALTER TABLE custom_roles ADD COLUMN role_type text DEFAULT 'admin_staff';
    UPDATE custom_roles SET role_type = 'system' WHERE is_system_role = true;
  END IF;
END $$;

-- Add new columns to role_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'resource_path'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN resource_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'resource_category'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN resource_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'parent_resource'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN parent_resource text;
  END IF;
END $$;

-- Create function to check user permissions quickly
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id uuid,
  p_resource_path text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission boolean;
  action_column text;
BEGIN
  -- Map action to column name
  action_column := CASE p_action
    WHEN 'view' THEN 'can_view'
    WHEN 'create' THEN 'can_create'
    WHEN 'edit' THEN 'can_edit'
    WHEN 'delete' THEN 'can_delete'
    ELSE NULL
  END;

  IF action_column IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user has permission through any assigned role
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1
      FROM user_custom_roles ucr
      JOIN role_permissions rp ON rp.role_id = ucr.role_id
      WHERE ucr.user_id = $1
        AND rp.resource_path = $2
        AND rp.%I = true
    )', action_column)
  INTO has_permission
  USING p_user_id, p_resource_path;

  RETURN COALESCE(has_permission, false);
END;
$$;

-- Create function to get user's accessible menu paths
CREATE OR REPLACE FUNCTION get_user_accessible_paths(p_user_id uuid)
RETURNS TABLE (resource_path text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rp.resource_path
  FROM user_custom_roles ucr
  JOIN role_permissions rp ON rp.role_id = ucr.role_id
  WHERE ucr.user_id = p_user_id
    AND rp.can_view = true
    AND rp.resource_path IS NOT NULL;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource_path 
  ON role_permissions(resource_path);

CREATE INDEX IF NOT EXISTS idx_role_permissions_category 
  ON role_permissions(resource_category);

CREATE INDEX IF NOT EXISTS idx_custom_roles_role_type 
  ON custom_roles(role_type);

-- Insert sample admin staff roles
INSERT INTO custom_roles (name, description, role_type, is_system_role, is_active) VALUES
  ('Receptionist', 'Front desk staff - manages appointments, patient check-ins, and basic inquiries', 'admin_staff', false, true),
  ('Medical Records Officer', 'Manages patient records, health documents, and clinical documentation', 'admin_staff', false, true),
  ('HR Manager', 'Manages staff, departments, attendance, leaves, and payroll', 'admin_staff', false, true),
  ('Finance Officer', 'Handles billing, payments, insurance claims, and financial reports', 'admin_staff', false, true),
  ('Clinic Manager', 'Oversees clinic operations, providers, locations, and services', 'admin_staff', false, true),
  ('Pharmacy Manager', 'Manages pharmacy operations, inventory, and prescriptions', 'admin_staff', false, true)
ON CONFLICT DO NOTHING;

-- Add comment to explain the system
COMMENT ON TABLE custom_roles IS 'Custom roles for admin staff with granular permissions. System roles (Admin, Provider, Pharmacy, Patient, Staff) are read-only.';
COMMENT ON TABLE role_permissions IS 'Granular permissions (View/Create/Edit/Delete) for admin portal menus and submenus.';
COMMENT ON FUNCTION check_user_permission IS 'Fast permission check for a specific user, resource path, and action.';
COMMENT ON FUNCTION get_user_accessible_paths IS 'Returns all menu paths a user can view based on their assigned roles.';
