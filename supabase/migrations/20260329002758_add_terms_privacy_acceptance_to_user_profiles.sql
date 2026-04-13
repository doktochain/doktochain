/*
  # Add Terms of Service and Privacy Policy Acceptance Tracking

  1. Modified Tables
    - `user_profiles`
      - `terms_accepted_at` (timestamptz) - When user accepted Terms of Service
      - `privacy_accepted_at` (timestamptz) - When user accepted Privacy Policy
      - `terms_version` (text) - Version of Terms accepted (e.g. '2026-03-15')
      - `privacy_version` (text) - Version of Privacy Policy accepted (e.g. '2026-03-15')

  2. Notes
    - Stores timestamps rather than booleans so we have an audit-quality record of when acceptance occurred
    - Stores version identifiers so we know which version the user agreed to
    - Both columns default to NULL (no acceptance yet)
    - Existing users are unaffected (NULL = not yet accepted under new flow)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'privacy_accepted_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN privacy_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'terms_version'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN terms_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'privacy_version'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN privacy_version text;
  END IF;
END $$;
