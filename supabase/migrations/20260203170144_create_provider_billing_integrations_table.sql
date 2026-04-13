/*
  # Create provider_billing_integrations table

  1. New Tables
    - provider_billing_integrations
      - Stores billing system integration credentials
      - Supports multiple integration types (ClaimSecure, Telus Health, HCAI, WCB)
      
  2. Security
    - Enable RLS
    - Only providers can access their own integrations
    - Credentials stored securely
*/

-- Create provider_billing_integrations table
CREATE TABLE IF NOT EXISTS provider_billing_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  integration_type text CHECK (integration_type IN ('claimsecure', 'telus_health', 'hcai', 'wcb')) NOT NULL,
  credentials jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, integration_type)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_provider_billing_integrations_provider_id ON provider_billing_integrations(provider_id);

-- Enable RLS
ALTER TABLE provider_billing_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view own billing integrations"
  ON provider_billing_integrations
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can insert own billing integrations"
  ON provider_billing_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own billing integrations"
  ON provider_billing_integrations
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own billing integrations"
  ON provider_billing_integrations
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );