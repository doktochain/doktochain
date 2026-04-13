/*
  # Add Insurance Card Reference to Appointments
  
  1. Changes
    - Add insurance_card_id column to appointments table
    - Foreign key to patient_insurance_cards
    - Allows tracking which insurance card was used for billing
    
  2. Security
    - Uses existing RLS policies
*/

-- Add insurance_card_id column to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS insurance_card_id uuid REFERENCES patient_insurance_cards(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_insurance_card ON appointments(insurance_card_id);

-- Add comment
COMMENT ON COLUMN appointments.insurance_card_id IS 'Reference to the insurance card used for this appointment';
