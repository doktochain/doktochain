/*
  # Add Family & Children Management Schema

  Comprehensive family and children management system with:
  - Child profiles with guardian relationships
  - Guardian access control
  - Child-specific health tracking
  - Growth and development monitoring
  - Vaccination schedules
  
  1. New Tables
    - `child_profiles` - Child/dependent profiles linked to guardians
    - `guardian_relationships` - Guardian-child relationship tracking
    - `guardianship_documents` - Proof of guardianship documents
    - `child_growth_records` - Height, weight, BMI tracking
    - `child_developmental_milestones` - Development tracking
    - `child_vaccinations` - Immunization records

  2. Security
    - Enable RLS on all tables
    - Guardian-only access to child data
    - Age-based restrictions
*/

-- Create child_profiles table
CREATE TABLE IF NOT EXISTS child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES user_profiles(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  profile_photo_url text,
  health_card_number text,
  health_card_province text,
  blood_type text,
  allergies text[],
  medical_conditions text[],
  current_medications text[],
  pediatrician_id uuid REFERENCES user_profiles(id),
  pediatrician_name text,
  pediatrician_phone text,
  school_name text,
  grade_level text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  special_needs text,
  dietary_restrictions text[],
  notes text,
  is_active boolean DEFAULT true,
  independence_granted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create guardian_relationships table
CREATE TABLE IF NOT EXISTS guardian_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES user_profiles(id),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'legal_guardian', 'stepparent', 'grandparent', 'other')),
  has_full_access boolean DEFAULT true,
  can_book_appointments boolean DEFAULT true,
  can_view_medical_records boolean DEFAULT true,
  can_manage_medications boolean DEFAULT true,
  can_authorize_treatment boolean DEFAULT true,
  is_primary_guardian boolean DEFAULT false,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(guardian_id, child_id)
);

-- Create guardianship_documents table
CREATE TABLE IF NOT EXISTS guardianship_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES user_profiles(id),
  document_type text NOT NULL CHECK (document_type IN ('birth_certificate', 'custody_order', 'guardianship_papers', 'adoption_papers', 'other')),
  document_url text NOT NULL,
  document_name text,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES user_profiles(id),
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create child_growth_records table
CREATE TABLE IF NOT EXISTS child_growth_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL REFERENCES user_profiles(id),
  record_date date NOT NULL,
  age_months integer NOT NULL,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  head_circumference_cm numeric(5,2),
  bmi numeric(5,2),
  height_percentile numeric(5,2),
  weight_percentile numeric(5,2),
  bmi_percentile numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create child_developmental_milestones table
CREATE TABLE IF NOT EXISTS child_developmental_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  milestone_category text NOT NULL CHECK (milestone_category IN ('motor', 'language', 'cognitive', 'social', 'emotional')),
  milestone_name text NOT NULL,
  milestone_description text,
  expected_age_months integer,
  achieved boolean DEFAULT false,
  achieved_date date,
  achieved_age_months integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create child_vaccinations table
CREATE TABLE IF NOT EXISTS child_vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  vaccine_type text,
  dose_number integer,
  total_doses integer,
  administered_date date,
  due_date date,
  administered_by text,
  administration_site text,
  lot_number text,
  manufacturer text,
  next_dose_due date,
  status text CHECK (status IN ('scheduled', 'completed', 'overdue', 'skipped', 'not_applicable')),
  side_effects text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_child_profiles_guardian ON child_profiles(guardian_id);
CREATE INDEX IF NOT EXISTS idx_child_profiles_active ON child_profiles(guardian_id, is_active);
CREATE INDEX IF NOT EXISTS idx_child_profiles_dob ON child_profiles(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_guardian ON guardian_relationships(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_child ON guardian_relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_guardianship_documents_child ON guardianship_documents(child_id);
CREATE INDEX IF NOT EXISTS idx_child_growth_records_child ON child_growth_records(child_id);
CREATE INDEX IF NOT EXISTS idx_child_growth_records_date ON child_growth_records(child_id, record_date);
CREATE INDEX IF NOT EXISTS idx_child_milestones_child ON child_developmental_milestones(child_id);
CREATE INDEX IF NOT EXISTS idx_child_vaccinations_child ON child_vaccinations(child_id);
CREATE INDEX IF NOT EXISTS idx_child_vaccinations_due ON child_vaccinations(child_id, due_date) WHERE status IN ('scheduled', 'overdue');

-- Enable Row Level Security
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardianship_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_developmental_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_vaccinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for child_profiles
CREATE POLICY "Guardians can view their children"
  ON child_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = guardian_id);

CREATE POLICY "Guardians can create child profiles"
  ON child_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "Guardians can update their children"
  ON child_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = guardian_id)
  WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "Guardians can delete their children profiles"
  ON child_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = guardian_id);

-- RLS Policies for guardian_relationships
CREATE POLICY "Guardians can view their relationships"
  ON guardian_relationships FOR SELECT
  TO authenticated
  USING (auth.uid() = guardian_id);

CREATE POLICY "Guardians can create relationships"
  ON guardian_relationships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "Guardians can update their relationships"
  ON guardian_relationships FOR UPDATE
  TO authenticated
  USING (auth.uid() = guardian_id)
  WITH CHECK (auth.uid() = guardian_id);

-- RLS Policies for guardianship_documents
CREATE POLICY "Guardians can view their documents"
  ON guardianship_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = guardian_id);

CREATE POLICY "Guardians can upload documents"
  ON guardianship_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = guardian_id);

-- RLS Policies for child_growth_records
CREATE POLICY "Guardians can view child growth records"
  ON child_growth_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_growth_records.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can add growth records"
  ON child_growth_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_growth_records.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

-- RLS Policies for child_developmental_milestones
CREATE POLICY "Guardians can view child milestones"
  ON child_developmental_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_developmental_milestones.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can add milestones"
  ON child_developmental_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_developmental_milestones.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can update milestones"
  ON child_developmental_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_developmental_milestones.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_developmental_milestones.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

-- RLS Policies for child_vaccinations
CREATE POLICY "Guardians can view child vaccinations"
  ON child_vaccinations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_vaccinations.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can add vaccinations"
  ON child_vaccinations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_vaccinations.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can update vaccinations"
  ON child_vaccinations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_vaccinations.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE child_profiles.id = child_vaccinations.child_id
      AND child_profiles.guardian_id = auth.uid()
    )
  );

-- Function to calculate child age in months
CREATE OR REPLACE FUNCTION calculate_age_months(dob date)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, dob));
END;
$$;

-- Function to check if child is eligible for independence (18 years old)
CREATE OR REPLACE FUNCTION is_eligible_for_independence(child_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  child_dob date;
  age_years integer;
BEGIN
  SELECT date_of_birth INTO child_dob
  FROM child_profiles
  WHERE id = child_id;
  
  age_years := EXTRACT(YEAR FROM AGE(CURRENT_DATE, child_dob));
  
  RETURN age_years >= 18;
END;
$$;