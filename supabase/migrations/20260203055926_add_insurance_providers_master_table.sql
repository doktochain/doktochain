/*
  # Add Insurance Providers Master Data Table

  1. New Tables
    - `insurance_providers_master`
      - `id` (uuid, primary key)
      - `name` (text) - Insurance provider name
      - `slug` (text) - URL-friendly slug
      - `logo_url` (text) - Logo image URL
      - `provider_type` (text) - Type of insurance (provincial, private, workers_comp)
      - `description` (text) - Brief description
      - `contact_phone` (text) - Contact phone number
      - `contact_email` (text) - Contact email
      - `website_url` (text) - Website URL
      - `provinces_covered` (text[]) - Array of provinces covered
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on insurance_providers_master table
    - Admins can manage all insurance providers
    - Everyone can read active insurance providers
    
  3. Seed Data
    - Add major Canadian insurance providers
*/

-- Create insurance providers master table
CREATE TABLE IF NOT EXISTS insurance_providers_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  provider_type text CHECK (provider_type IN ('provincial', 'private', 'workers_comp', 'other')) DEFAULT 'private',
  description text,
  contact_phone text,
  contact_email text,
  website_url text,
  provinces_covered text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE insurance_providers_master ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view active insurance providers"
  ON insurance_providers_master
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can insert insurance providers"
  ON insurance_providers_master
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update insurance providers"
  ON insurance_providers_master
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete insurance providers"
  ON insurance_providers_master
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Seed data with Canadian insurance providers
INSERT INTO insurance_providers_master (name, slug, provider_type, description, provinces_covered, is_active) VALUES
  ('OHIP (Ontario Health Insurance Plan)', 'ohip', 'provincial', 'Ontario provincial health insurance', ARRAY['ON'], true),
  ('MSP (Medical Services Plan)', 'msp-bc', 'provincial', 'British Columbia provincial health insurance', ARRAY['BC'], true),
  ('RAMQ (Régie de l''assurance maladie du Québec)', 'ramq', 'provincial', 'Quebec provincial health insurance', ARRAY['QC'], true),
  ('Alberta Health Services', 'alberta-health', 'provincial', 'Alberta provincial health insurance', ARRAY['AB'], true),
  ('Manitoba Health', 'manitoba-health', 'provincial', 'Manitoba provincial health insurance', ARRAY['MB'], true),
  ('Saskatchewan Health', 'saskatchewan-health', 'provincial', 'Saskatchewan provincial health insurance', ARRAY['SK'], true),
  ('New Brunswick Medicare', 'nb-medicare', 'provincial', 'New Brunswick provincial health insurance', ARRAY['NB'], true),
  ('Nova Scotia Health Card', 'ns-health-card', 'provincial', 'Nova Scotia provincial health insurance', ARRAY['NS'], true),
  ('PEI Health Card', 'pei-health', 'provincial', 'Prince Edward Island provincial health insurance', ARRAY['PE'], true),
  ('Newfoundland and Labrador MCP', 'nl-mcp', 'provincial', 'Newfoundland and Labrador Medical Care Plan', ARRAY['NL'], true),
  ('Manulife Financial', 'manulife', 'private', 'Leading Canadian insurance provider', ARRAY['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL'], true),
  ('Sun Life Financial', 'sun-life', 'private', 'Major health insurance provider', ARRAY['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL'], true),
  ('Great-West Life', 'great-west-life', 'private', 'Comprehensive health coverage', ARRAY['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL'], true),
  ('Canada Life', 'canada-life', 'private', 'Health and dental insurance', ARRAY['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL'], true),
  ('Blue Cross', 'blue-cross', 'private', 'Travel and health insurance', ARRAY['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL'], true),
  ('WSIB (Workplace Safety and Insurance Board)', 'wsib', 'workers_comp', 'Ontario workers compensation', ARRAY['ON'], true),
  ('WorkSafeBC', 'worksafebc', 'workers_comp', 'BC workers compensation', ARRAY['BC'], true),
  ('WCB Alberta', 'wcb-alberta', 'workers_comp', 'Alberta workers compensation', ARRAY['AB'], true),
  ('CNESST (Quebec)', 'cnesst', 'workers_comp', 'Quebec workers compensation', ARRAY['QC'], true),
  ('WCB Manitoba', 'wcb-manitoba', 'workers_comp', 'Manitoba workers compensation', ARRAY['MB'], true)
ON CONFLICT (slug) DO NOTHING;