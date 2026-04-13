/*
  # Create provider_insurance_plans table

  1. New Tables
    - provider_insurance_plans
      - Links providers to insurance_providers_master
      - Tracks direct billing and coverage details
      
  2. Security
    - Enable RLS
    - Providers can manage their own insurance plans
    - Public can view provider insurance acceptance
*/

-- Create provider_insurance_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS provider_insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  insurance_provider_id uuid REFERENCES insurance_providers_master(id) ON DELETE CASCADE NOT NULL,
  direct_billing_enabled boolean DEFAULT false,
  coverage_limitations text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, insurance_provider_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_provider_insurance_plans_provider_id ON provider_insurance_plans(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_insurance_plans_insurance_provider_id ON provider_insurance_plans(insurance_provider_id);

-- Enable RLS
ALTER TABLE provider_insurance_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view provider insurance plans"
  ON provider_insurance_plans
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Providers can insert own insurance plans"
  ON provider_insurance_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can update own insurance plans"
  ON provider_insurance_plans
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Providers can delete own insurance plans"
  ON provider_insurance_plans
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
    OR is_admin()
  );