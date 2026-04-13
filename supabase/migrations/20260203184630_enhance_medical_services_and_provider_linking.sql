/*
  # Enhance Medical Services and Provider Linking
  
  1. Changes
    - Add medical_service_id to provider_services table
    - Add default price to medical_services
    - Seed medical_services with common healthcare services
    - Add indexes for better query performance
    
  2. Security
    - Maintains existing RLS policies
*/

-- Add medical_service_id to provider_services if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_services' AND column_name = 'medical_service_id'
  ) THEN
    ALTER TABLE provider_services ADD COLUMN medical_service_id uuid REFERENCES medical_services(id);
  END IF;
END $$;

-- Add default_price to medical_services if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_services' AND column_name = 'default_price'
  ) THEN
    ALTER TABLE medical_services ADD COLUMN default_price numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add unique constraint to service_code
ALTER TABLE medical_services 
  DROP CONSTRAINT IF EXISTS medical_services_service_code_key;
  
ALTER TABLE medical_services 
  ADD CONSTRAINT medical_services_service_code_key UNIQUE (service_code);

-- Seed medical_services with common consultation types
INSERT INTO medical_services (
  service_name,
  service_code,
  description,
  category,
  duration_minutes,
  default_price,
  requires_lab_work,
  is_telemedicine_eligible,
  is_active
) VALUES
  (
    'Initial Consultation',
    'CONS-001',
    'First-time visit for new concerns or symptoms',
    'Consultation',
    30,
    150.00,
    false,
    true,
    true
  ),
  (
    'Follow-up Visit',
    'CONS-002',
    'Continuing care for an existing condition',
    'Consultation',
    20,
    100.00,
    false,
    true,
    true
  ),
  (
    'Annual Physical',
    'PREV-001',
    'Comprehensive yearly health examination',
    'Preventive Care',
    45,
    200.00,
    true,
    false,
    true
  ),
  (
    'Specialist Consultation',
    'SPEC-001',
    'Specialized medical evaluation and advice',
    'Specialist Care',
    40,
    250.00,
    false,
    true,
    true
  ),
  (
    'Urgent Care',
    'URG-001',
    'Same-day care for non-emergency conditions',
    'Urgent Care',
    30,
    175.00,
    false,
    false,
    true
  ),
  (
    'Mental Health Counseling',
    'MH-001',
    'Therapy and mental health support',
    'Mental Health',
    50,
    180.00,
    false,
    true,
    true
  ),
  (
    'Pediatric Consultation',
    'PED-001',
    'Healthcare services for children',
    'Pediatrics',
    30,
    140.00,
    false,
    true,
    true
  ),
  (
    'Chronic Disease Management',
    'CDM-001',
    'Ongoing management of chronic conditions',
    'Chronic Care',
    30,
    160.00,
    true,
    true,
    true
  ),
  (
    'Prenatal Care Visit',
    'OB-001',
    'Routine pregnancy monitoring and care',
    'Obstetrics',
    30,
    170.00,
    true,
    false,
    true
  ),
  (
    'Sports Medicine Consultation',
    'SPORT-001',
    'Evaluation and treatment of sports injuries',
    'Sports Medicine',
    40,
    190.00,
    false,
    true,
    true
  ),
  (
    'Dermatology Consultation',
    'DERM-001',
    'Skin, hair, and nail condition evaluation',
    'Dermatology',
    30,
    165.00,
    false,
    true,
    true
  ),
  (
    'Cardiology Consultation',
    'CARD-001',
    'Heart and cardiovascular system evaluation',
    'Cardiology',
    40,
    280.00,
    true,
    false,
    true
  ),
  (
    'Allergy Testing',
    'ALL-001',
    'Comprehensive allergy assessment',
    'Allergy & Immunology',
    60,
    220.00,
    true,
    false,
    true
  ),
  (
    'Nutrition Counseling',
    'NUT-001',
    'Dietary guidance and meal planning',
    'Nutrition',
    45,
    130.00,
    false,
    true,
    true
  ),
  (
    'Physical Therapy Evaluation',
    'PT-001',
    'Assessment for rehabilitation needs',
    'Physical Therapy',
    45,
    145.00,
    false,
    false,
    true
  )
ON CONFLICT (service_code) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_provider_services_medical_service_id 
  ON provider_services(medical_service_id);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id 
  ON provider_services(provider_id);

CREATE INDEX IF NOT EXISTS idx_medical_services_category 
  ON medical_services(category) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_medical_services_active 
  ON medical_services(is_active, deleted_at);