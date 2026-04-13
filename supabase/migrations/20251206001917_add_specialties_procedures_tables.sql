/*
  # Add Specialties and Procedures Tables

  1. New Tables
    - `specialties_master` - Master list of medical specialties
    - `procedures_master` - Master list of medical procedures with detailed info
    - `provider_procedures` - Links providers to procedures they offer
    
  2. Security
    - Enable RLS on all tables
    - Public read access for specialties and procedures
    - Only authenticated providers can manage their procedures
*/

-- Specialties Master Table
CREATE TABLE IF NOT EXISTS specialties_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  long_description text,
  icon text,
  category text,
  common_conditions text[],
  seo_title text,
  seo_description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specialties_slug ON specialties_master(slug);
CREATE INDEX IF NOT EXISTS idx_specialties_active ON specialties_master(is_active);

-- Procedures Master Table
CREATE TABLE IF NOT EXISTS procedures_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  cpt_code text,
  description text NOT NULL,
  long_description text,
  category text,
  specialty_id uuid REFERENCES specialties_master(id),
  
  preparation_info text,
  recovery_info text,
  average_duration_minutes integer,
  what_to_expect text,
  
  typical_cost_min numeric(10, 2),
  typical_cost_max numeric(10, 2),
  
  related_procedures_ids uuid[],
  faq_data jsonb,
  
  seo_title text,
  seo_description text,
  is_active boolean DEFAULT true,
  is_common boolean DEFAULT false,
  display_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedures_slug ON procedures_master(slug);
CREATE INDEX IF NOT EXISTS idx_procedures_specialty ON procedures_master(specialty_id);
CREATE INDEX IF NOT EXISTS idx_procedures_active ON procedures_master(is_active);
CREATE INDEX IF NOT EXISTS idx_procedures_common ON procedures_master(is_common);

-- Provider Procedures Linking Table
CREATE TABLE IF NOT EXISTS provider_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES procedures_master(id) ON DELETE CASCADE,
  estimated_cost numeric(10, 2),
  notes text,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, procedure_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_procedures_provider ON provider_procedures(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_procedures_procedure ON provider_procedures(procedure_id);

-- Enable RLS
ALTER TABLE specialties_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_procedures ENABLE ROW LEVEL SECURITY;

-- Public read access for specialties
CREATE POLICY "Anyone can view active specialties"
  ON specialties_master FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Public read access for procedures
CREATE POLICY "Anyone can view active procedures"
  ON procedures_master FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Provider procedures policies
CREATE POLICY "Anyone can view provider procedures"
  ON provider_procedures FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Providers can manage their procedures"
  ON provider_procedures FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );
