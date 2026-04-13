/*
  # Add Logo URL to Pharmacies Table

  1. Changes
    - Add logo_url column to pharmacies table
    
  2. Notes
    - Allows pharmacies to upload and display their logo/avatar
*/

-- Add logo_url column
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS logo_url text;