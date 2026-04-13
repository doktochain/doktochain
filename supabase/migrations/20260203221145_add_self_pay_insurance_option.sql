/*
  # Add Self-Pay Insurance Option
  
  1. Changes
    - Insert a "Self-Pay" option in insurance_providers_master
    - This allows patients without insurance to pay out of pocket
    - Available across all Canadian provinces
    
  2. Security
    - Uses existing RLS policies
*/

-- Insert Self-Pay option
INSERT INTO insurance_providers_master (
  name,
  slug,
  provider_type,
  description,
  provinces_covered,
  is_active
) VALUES (
  'Self-Pay (Out of Pocket)',
  'self-pay',
  'private',
  'Pay directly for services without insurance coverage. Patients pay out of pocket and can request receipts for potential reimbursement.',
  ARRAY['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
  true
)
ON CONFLICT (slug) DO NOTHING;
