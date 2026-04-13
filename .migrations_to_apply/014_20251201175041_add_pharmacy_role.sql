/*
  # Add Pharmacy Role Support

  1. Changes
    - Update user_profiles role check constraint to include 'pharmacy'
    - This allows users to have the 'pharmacy' role in addition to patient, provider, and admin

  2. Security
    - No RLS changes needed as existing policies will apply to pharmacy role users
*/

-- Drop the existing constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint that includes pharmacy
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role = ANY (ARRAY['patient'::text, 'provider'::text, 'admin'::text, 'pharmacy'::text]));
