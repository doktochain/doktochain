/*
  # Advanced Authentication and Identity Verification

  1. Schema Updates
    - Add phone verification fields to user_profiles
    - Add MFA fields
    - Add identity verification status and tracking
    - Add profile completion percentage
    - Create identity_documents table for verification records
    - Create phone_verification_codes table for OTP

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies
    - Ensure secure OTP handling
*/

-- Add new fields to user_profiles for enhanced authentication
DO $$
BEGIN
  -- Phone verification fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_verified_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_verified_at timestamptz;
  END IF;

  -- MFA fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'mfa_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN mfa_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'mfa_secret'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN mfa_secret text;
  END IF;

  -- Identity verification fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'identity_verified'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN identity_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'identity_verified_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN identity_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'identity_verification_method'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN identity_verification_method text CHECK (
      identity_verification_method IN ('drivers_license', 'health_card', 'passport', 'manual')
    );
  END IF;

  -- Profile completion tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completion_percentage'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completion_percentage integer DEFAULT 0 CHECK (
      profile_completion_percentage >= 0 AND profile_completion_percentage <= 100
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completed_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completed_at timestamptz;
  END IF;

  -- Registration method tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'registration_method'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN registration_method text DEFAULT 'email' CHECK (
      registration_method IN ('email', 'phone')
    );
  END IF;
END $$;

-- Phone Verification Codes (OTP)
CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'login', 'verification', 'mfa')),
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Identity Documents (for verification)
CREATE TABLE IF NOT EXISTS identity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (
    document_type IN ('drivers_license', 'health_card', 'passport', 'other')
  ),
  document_number text,
  issuing_province text,
  expiry_date date,
  front_image_url text,
  back_image_url text,
  verification_status text DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'rejected', 'expired')
  ),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  rejection_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email Verification Codes (for email OTP if needed)
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'password_reset', 'verification')),
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON phone_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verification_user ON phone_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_expires ON phone_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_documents_user ON identity_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_documents_status ON identity_documents(verification_status);

-- ROW LEVEL SECURITY
ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_documents ENABLE ROW LEVEL SECURITY;

-- Phone verification codes policies
CREATE POLICY "Users can view their own verification codes"
  ON phone_verification_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can create verification codes"
  ON phone_verification_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their verification attempts"
  ON phone_verification_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR phone = (SELECT phone FROM user_profiles WHERE id = auth.uid()));

-- Email verification codes policies
CREATE POLICY "Users can view their own email verification codes"
  ON email_verification_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can create email verification codes"
  ON email_verification_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their email verification attempts"
  ON email_verification_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Identity documents policies
CREATE POLICY "Users can view their own identity documents"
  ON identity_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own identity documents"
  ON identity_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own identity documents"
  ON identity_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all identity documents"
  ON identity_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update verification status"
  ON identity_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_profile_id uuid)
RETURNS integer AS $$
DECLARE
  completion integer := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM user_profiles WHERE id = user_profile_id;

  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;

  -- Essential fields (10 points each = 100 total)
  IF profile_record.first_name IS NOT NULL AND profile_record.first_name != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.last_name IS NOT NULL AND profile_record.last_name != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.date_of_birth IS NOT NULL THEN
    completion := completion + 10;
  END IF;

  IF profile_record.gender IS NOT NULL AND profile_record.gender != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.address_line1 IS NOT NULL AND profile_record.address_line1 != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.city IS NOT NULL AND profile_record.city != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.province IS NOT NULL AND profile_record.province != '' THEN
    completion := completion + 10;
  END IF;

  IF profile_record.postal_code IS NOT NULL AND profile_record.postal_code != '' THEN
    completion := completion + 10;
  END IF;

  RETURN completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verification_codes WHERE expires_at < now();
  DELETE FROM email_verification_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;