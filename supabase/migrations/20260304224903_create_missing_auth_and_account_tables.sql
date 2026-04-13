/*
  # Create missing auth and account management tables

  1. New Tables
    - `login_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `login_timestamp` (timestamptz)
      - `ip_address` (text)
      - `user_agent` (text)
      - `device_type` (text)
      - `browser` (text)
      - `operating_system` (text)
      - `location_city` (text)
      - `location_country` (text)
      - `login_method` (text)
      - `success` (boolean)
      - `failure_reason` (text)
      - `session_id` (text)

    - `account_deletion_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `reason` (text)
      - `status` (text, default 'pending')
      - `scheduled_deletion_date` (timestamptz)

    - `data_export_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `request_type` (text)
      - `status` (text, default 'pending')
      - `requested_at` (timestamptz, default now)
      - `processed_at` (timestamptz)
      - `download_url` (text)
      - `expires_at` (timestamptz)
      - `file_size_bytes` (bigint)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own records
    - Admins can view all records
*/

-- login_history
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_timestamp timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  operating_system text,
  location_city text,
  location_country text,
  login_method text DEFAULT 'email_password',
  success boolean NOT NULL DEFAULT true,
  failure_reason text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert login history"
  ON login_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all login history"
  ON login_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- account_deletion_requests
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  scheduled_deletion_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deletion requests"
  ON account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own deletion requests"
  ON account_deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deletion requests"
  ON account_deletion_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update deletion requests"
  ON account_deletion_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- data_export_requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  download_url text,
  expires_at timestamptz,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export requests"
  ON data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create export requests"
  ON data_export_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all export requests"
  ON data_export_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));
