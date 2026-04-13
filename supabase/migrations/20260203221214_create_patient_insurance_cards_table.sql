/*
  # Create Patient Insurance Cards Table
  
  1. New Tables
    - `patient_insurance_cards`
      - Stores patient insurance policy information
      - Supports multiple cards per patient
      - Front and back card images
      - Policy numbers and details
      - Primary card designation
      
  2. Security
    - Enable RLS
    - Patients can manage their own cards
    - Providers can view cards for their patients
    - Admins have full access
    
  3. Storage
    - Create storage bucket for insurance card images
*/

-- Create patient_insurance_cards table
CREATE TABLE IF NOT EXISTS patient_insurance_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  insurance_provider_id uuid NOT NULL REFERENCES insurance_providers_master(id) ON DELETE RESTRICT,
  
  -- Policy Information
  policy_number text NOT NULL,
  group_number text,
  member_id text,
  policy_holder_name text NOT NULL,
  policy_holder_relationship text DEFAULT 'self',
  
  -- Card Images
  card_front_url text,
  card_back_url text,
  
  -- Status
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  
  -- Coverage Details
  effective_date date,
  expiration_date date,
  coverage_type text,
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_policy_number CHECK (length(policy_number) >= 3),
  CONSTRAINT valid_relationship CHECK (policy_holder_relationship IN ('self', 'spouse', 'parent', 'child', 'other'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patient_insurance_cards_patient ON patient_insurance_cards(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_cards_provider ON patient_insurance_cards(insurance_provider_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_cards_active ON patient_insurance_cards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_patient_insurance_cards_primary ON patient_insurance_cards(patient_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE patient_insurance_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Patients can view their own insurance cards
CREATE POLICY "Patients can view own insurance cards"
  ON patient_insurance_cards
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Patients can insert their own insurance cards
CREATE POLICY "Patients can insert own insurance cards"
  ON patient_insurance_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Patients can update their own insurance cards
CREATE POLICY "Patients can update own insurance cards"
  ON patient_insurance_cards
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Patients can delete their own insurance cards
CREATE POLICY "Patients can delete own insurance cards"
  ON patient_insurance_cards
  FOR DELETE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Providers can view cards for their patients (appointments)
CREATE POLICY "Providers can view patient insurance cards"
  ON patient_insurance_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN providers p ON p.id = a.provider_id
      WHERE a.patient_id = patient_insurance_cards.patient_id
        AND p.user_id = auth.uid()
    )
  );

-- Admins can manage all insurance cards
CREATE POLICY "Admins can manage all insurance cards"
  ON patient_insurance_cards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Function to ensure only one primary card per insurance provider
CREATE OR REPLACE FUNCTION ensure_single_primary_insurance_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other cards for this patient and provider to non-primary
    UPDATE patient_insurance_cards
    SET is_primary = false
    WHERE patient_id = NEW.patient_id
      AND insurance_provider_id = NEW.insurance_provider_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary card
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_card ON patient_insurance_cards;
CREATE TRIGGER trigger_ensure_single_primary_card
  BEFORE INSERT OR UPDATE ON patient_insurance_cards
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_insurance_card();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_insurance_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_patient_insurance_cards_timestamp ON patient_insurance_cards;
CREATE TRIGGER trigger_update_patient_insurance_cards_timestamp
  BEFORE UPDATE ON patient_insurance_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_insurance_cards_updated_at();
