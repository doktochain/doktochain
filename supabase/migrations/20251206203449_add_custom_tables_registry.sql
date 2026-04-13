/*
  # Custom Tables Registry System

  ## Overview
  This migration creates a comprehensive system for dynamically creating and managing custom database tables.
  Admins can create new tables through the UI with custom columns, relationships, and permissions.

  ## New Tables

  ### 1. `custom_tables_registry`
  Stores metadata about dynamically created custom tables
  - `id` (uuid, primary key)
  - `table_name` (text, unique) - Actual database table name
  - `display_name` (text) - User-friendly name
  - `description` (text) - Purpose and usage description
  - `icon` (text) - Icon identifier from lucide-react
  - `color` (text) - Color theme for UI
  - `category` (text) - Classification (HR, Clinical, Operations, etc.)
  - `status` (text) - active, archived, draft
  - `is_public` (boolean) - Whether table is accessible to all users
  - `created_by` (uuid) - User who created the table
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `deleted_at` (timestamptz) - Soft delete

  ### 2. `custom_table_columns`
  Stores detailed column specifications for custom tables
  - `id` (uuid, primary key)
  - `table_id` (uuid) - Foreign key to custom_tables_registry
  - `column_name` (text) - Actual database column name
  - `display_label` (text) - User-friendly label
  - `data_type` (text) - PostgreSQL data type
  - `is_required` (boolean) - NOT NULL constraint
  - `is_unique` (boolean) - UNIQUE constraint
  - `default_value` (text) - Default value expression
  - `validation_rules` (jsonb) - Custom validation rules
  - `ui_input_type` (text) - Input type for forms
  - `help_text` (text) - Helper text for users
  - `column_order` (integer) - Display order
  - `is_visible` (boolean) - Show/hide in UI
  - `foreign_key_table` (text) - Related table name
  - `foreign_key_column` (text) - Related column name
  - `created_at` (timestamptz)

  ### 3. `custom_table_permissions`
  Stores granular access control for custom tables
  - `id` (uuid, primary key)
  - `table_id` (uuid) - Foreign key to custom_tables_registry
  - `role_name` (text) - User role (admin, provider, pharmacy, patient)
  - `can_view` (boolean) - Read permission
  - `can_create` (boolean) - Insert permission
  - `can_update` (boolean) - Update permission
  - `can_delete` (boolean) - Delete permission
  - `row_level_filter` (text) - RLS filter expression
  - `created_at` (timestamptz)

  ### 4. `custom_table_audit_log`
  Tracks all DDL operations on custom tables
  - `id` (uuid, primary key)
  - `table_id` (uuid) - Foreign key to custom_tables_registry
  - `operation` (text) - create_table, alter_table, drop_table
  - `sql_executed` (text) - The actual SQL that was run
  - `success` (boolean) - Whether operation succeeded
  - `error_message` (text) - Error details if failed
  - `performed_by` (uuid) - User who performed operation
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only admin users can manage custom tables
  - Audit all DDL operations
  - Validate all SQL before execution

  ## Notes
  - Custom tables are created dynamically through edge functions
  - All custom tables automatically get: id, created_at, updated_at, deleted_at
  - RLS policies are auto-generated based on permissions
  - Real-time is automatically enabled for all custom tables
*/

-- Create custom_tables_registry table
CREATE TABLE IF NOT EXISTS custom_tables_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  icon text DEFAULT 'Database',
  color text DEFAULT '#6366f1',
  category text DEFAULT 'general',
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT valid_table_name CHECK (table_name ~ '^[a-z][a-z0-9_]*$')
);

-- Create custom_table_columns table
CREATE TABLE IF NOT EXISTS custom_table_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES custom_tables_registry(id) ON DELETE CASCADE NOT NULL,
  column_name text NOT NULL,
  display_label text NOT NULL,
  data_type text NOT NULL,
  is_required boolean DEFAULT false,
  is_unique boolean DEFAULT false,
  default_value text,
  validation_rules jsonb DEFAULT '{}',
  ui_input_type text DEFAULT 'text',
  help_text text,
  column_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  foreign_key_table text,
  foreign_key_column text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(table_id, column_name),
  CONSTRAINT valid_column_name CHECK (column_name ~ '^[a-z][a-z0-9_]*$')
);

-- Create custom_table_permissions table
CREATE TABLE IF NOT EXISTS custom_table_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES custom_tables_registry(id) ON DELETE CASCADE NOT NULL,
  role_name text NOT NULL CHECK (role_name IN ('admin', 'provider', 'pharmacy', 'patient', 'public')),
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  row_level_filter text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(table_id, role_name)
);

-- Create custom_table_audit_log table
CREATE TABLE IF NOT EXISTS custom_table_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES custom_tables_registry(id) ON DELETE SET NULL,
  operation text NOT NULL,
  sql_executed text,
  success boolean DEFAULT true,
  error_message text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_tables_status ON custom_tables_registry(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_tables_category ON custom_tables_registry(category);
CREATE INDEX IF NOT EXISTS idx_custom_table_columns_table_id ON custom_table_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_custom_table_columns_order ON custom_table_columns(table_id, column_order);
CREATE INDEX IF NOT EXISTS idx_custom_table_permissions_table ON custom_table_permissions(table_id);
CREATE INDEX IF NOT EXISTS idx_custom_table_audit_created ON custom_table_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE custom_tables_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_table_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_table_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_table_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_tables_registry
CREATE POLICY "Admins can view all custom tables"
  ON custom_tables_registry FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create custom tables"
  ON custom_tables_registry FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update custom tables"
  ON custom_tables_registry FOR UPDATE
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

CREATE POLICY "Admins can delete custom tables"
  ON custom_tables_registry FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for custom_table_columns
CREATE POLICY "Admins can view all custom table columns"
  ON custom_table_columns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage custom table columns"
  ON custom_table_columns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for custom_table_permissions
CREATE POLICY "Admins can view all custom table permissions"
  ON custom_table_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage custom table permissions"
  ON custom_table_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for custom_table_audit_log
CREATE POLICY "Admins can view audit logs"
  ON custom_table_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON custom_table_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_custom_tables_registry_updated_at
  BEFORE UPDATE ON custom_tables_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_table_updated_at();