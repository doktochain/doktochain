/*
  # Add Clinic Provider Invitations System

  1. New Tables
    - `clinic_provider_invitations`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, references clinics) - the clinic sending the invitation
      - `invited_by` (uuid, references auth.users) - clinic owner who sent the invite
      - `email` (text) - email address of the invited provider
      - `first_name` (text) - invited provider's first name
      - `last_name` (text) - invited provider's last name
      - `specialty` (text) - expected specialty/role
      - `role_at_clinic` (text) - role being offered at the clinic
      - `message` (text) - personal message from clinic
      - `token` (text, unique) - unique invitation token for acceptance link
      - `status` (text) - invitation status: pending, accepted, declined, expired, cancelled
      - `expires_at` (timestamptz) - when the invitation expires
      - `accepted_at` (timestamptz) - when the invitation was accepted
      - `provider_id` (uuid) - linked provider after acceptance
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `clinic_provider_invitations` table
    - Clinic owners can manage their own invitations
    - Admins can view all invitations
    - Providers can view invitations sent to their email

  3. Important Notes
    - The `token` column stores a unique token for email invitation links
    - The `expires_at` defaults to 30 days from creation
    - Status transitions: pending -> accepted/declined/expired/cancelled
*/

CREATE TABLE IF NOT EXISTS clinic_provider_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  specialty text DEFAULT '',
  role_at_clinic text DEFAULT 'attending_physician',
  message text DEFAULT '',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  provider_id uuid REFERENCES providers(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_invitations_clinic_id ON clinic_provider_invitations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_email ON clinic_provider_invitations(email);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_token ON clinic_provider_invitations(token);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_status ON clinic_provider_invitations(status);

ALTER TABLE clinic_provider_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can view own invitations"
  ON clinic_provider_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_provider_invitations.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clinic owners can create invitations"
  ON clinic_provider_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_provider_invitations.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clinic owners can update own invitations"
  ON clinic_provider_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_provider_invitations.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_provider_invitations.clinic_id
      AND clinics.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invitations"
  ON clinic_provider_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Providers can view invitations by email"
  ON clinic_provider_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Providers can update invitations by email"
  ON clinic_provider_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
