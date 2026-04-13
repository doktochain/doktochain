/*
  # Enhanced Authentication and Profile System

  1. New Tables
    - `mfa_settings` - Multi-factor authentication configuration
      - `user_id` (uuid, references auth.users)
      - `mfa_enabled` (boolean)
      - `mfa_method` (text) - 'sms', 'email', 'authenticator'
      - `phone_number` (text)
      - `phone_verified` (boolean)
      - `backup_codes` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `otp_codes` - One-time password codes
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `code` (text)
      - `method` (text) - 'sms', 'email'
      - `purpose` (text) - 'login', 'phone_verification', 'reset_password'
      - `expires_at` (timestamptz)
      - `verified` (boolean)
      - `created_at` (timestamptz)
    
    - `trusted_devices` - Trusted device management
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `device_id` (text)
      - `device_name` (text)
      - `device_type` (text)
      - `ip_address` (text)
      - `last_used_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `identity_verification` - Identity verification documents
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_type` (text) - 'drivers_license', 'health_card', 'passport'
      - `document_number` (text)
      - `document_front_url` (text)
      - `document_back_url` (text)
      - `verification_status` (text) - 'pending', 'verified', 'rejected'
      - `verified_by` (uuid)
      - `verified_at` (timestamptz)
      - `rejection_reason` (text)
      - `created_at` (timestamptz)

  2. Updates to existing tables
    - Add profile completion tracking to user_profiles
    - Add phone verification fields

  3. Security
    - Enable RLS on all new tables
    - Add policies for user access
*/

-- Create MFA settings table
CREATE TABLE IF NOT EXISTS mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mfa_enabled boolean DEFAULT false,
  mfa_method text CHECK (mfa_method IN ('sms', 'email', 'authenticator')),
  phone_number text,
  phone_verified boolean DEFAULT false,
  backup_codes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA settings"
  ON mfa_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings"
  ON mfa_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA settings"
  ON mfa_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  method text NOT NULL CHECK (method IN ('sms', 'email')),
  purpose text NOT NULL CHECK (purpose IN ('login', 'phone_verification', 'reset_password')),
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTP codes"
  ON otp_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OTP codes"
  ON otp_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OTP codes"
  ON otp_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trusted devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id text NOT NULL,
  device_name text,
  device_type text,
  ip_address text,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trusted devices"
  ON trusted_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trusted devices"
  ON trusted_devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trusted devices"
  ON trusted_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create identity verification table
CREATE TABLE IF NOT EXISTS identity_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('drivers_license', 'health_card', 'passport')),
  document_number text,
  document_front_url text,
  document_back_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE identity_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own identity verification"
  ON identity_verification FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identity verification"
  ON identity_verification FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all identity verifications"
  ON identity_verification FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update identity verifications"
  ON identity_verification FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add profile completion tracking to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_percentage'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completion_percentage integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verification_user_id ON identity_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verification_status ON identity_verification(verification_status);
