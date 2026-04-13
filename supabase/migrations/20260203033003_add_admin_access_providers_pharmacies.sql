/*
  # Add Admin Access to Providers and Pharmacies

  1. Changes
    - Add policy for admins to update providers
    - Add policy for admins to delete providers
    - Add policy for admins to insert providers
    - Add policy for admins to update pharmacies
    - Add policy for admins to delete pharmacies
    - Add policy for admins to insert pharmacies
    
  2. Security
    - Policies check if user role is 'admin'
*/

-- Providers: Admin policies
DROP POLICY IF EXISTS "Admins can update providers" ON providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON providers;
DROP POLICY IF EXISTS "Admins can insert providers" ON providers;

CREATE POLICY "Admins can update providers"
  ON providers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete providers"
  ON providers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert providers"
  ON providers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Pharmacies: Admin policies
DROP POLICY IF EXISTS "Admins can update pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Admins can delete pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Admins can insert pharmacies" ON pharmacies;

CREATE POLICY "Admins can update pharmacies"
  ON pharmacies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete pharmacies"
  ON pharmacies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert pharmacies"
  ON pharmacies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );