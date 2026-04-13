/*
  # Fix Role Permissions Schema
  
  1. Changes
    - Drop old conflicting role_permissions table
    - Recreate with correct schema including resource, can_view, can_create, can_edit, can_delete
    - Reapply RLS policies
    
  2. Notes
    - This fixes the conflict between two different schemas
    - Preserves the correct design for granular menu permissions
*/

-- Drop the old table (this will cascade delete any existing data)
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Recreate with correct schema
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES custom_roles(id) ON DELETE CASCADE NOT NULL,
  resource text NOT NULL,
  resource_path text,
  resource_category text,
  parent_resource text,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role_id, resource)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Admins can view all permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Also add these older policies for compatibility
CREATE POLICY "role_perms_view"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "role_perms_manage"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Recreate indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_resource_path ON role_permissions(resource_path);
CREATE INDEX idx_role_permissions_category ON role_permissions(resource_category);
