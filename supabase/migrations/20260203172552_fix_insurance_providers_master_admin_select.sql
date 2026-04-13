/*
  # Fix Insurance Providers Master Admin Access

  1. Changes
    - Add admin SELECT policy to view all insurance providers (not just active ones)
    - Keeps existing public policy for viewing active providers
    
  2. Security
    - Admins can see all providers (active and inactive)
    - Public can only see active providers
*/

-- Add admin SELECT policy
CREATE POLICY "Admins can view all insurance providers"
  ON insurance_providers_master
  FOR SELECT
  TO authenticated
  USING (is_admin());