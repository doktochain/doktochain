/*
  # Fix Providers and Pharmacies RLS Policies

  1. Changes
    - Update providers and pharmacies admin policies to use the is_admin() function
    
  2. Security
    - Uses helper function to avoid recursion
    - Maintains admin-only access
*/

-- Update Providers policies
DROP POLICY IF EXISTS "Admins can update providers" ON providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON providers;
DROP POLICY IF EXISTS "Admins can insert providers" ON providers;

CREATE POLICY "Admins can update providers"
  ON providers
  FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete providers"
  ON providers
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert providers"
  ON providers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Update Pharmacies policies
DROP POLICY IF EXISTS "Admins can update pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Admins can delete pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Admins can insert pharmacies" ON pharmacies;

CREATE POLICY "Admins can update pharmacies"
  ON pharmacies
  FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete pharmacies"
  ON pharmacies
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert pharmacies"
  ON pharmacies
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());