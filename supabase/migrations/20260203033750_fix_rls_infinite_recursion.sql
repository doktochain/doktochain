/*
  # Fix RLS Infinite Recursion Issue

  1. Changes
    - Drop the problematic admin policies that cause infinite recursion
    - Create a helper function with SECURITY DEFINER to check admin role
    - Recreate admin policies using the helper function
    
  2. Security
    - Helper function bypasses RLS to prevent recursion
    - Policies still properly restrict access to admins only
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any user profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete any user profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;

-- Create a helper function to check if current user is admin
-- SECURITY DEFINER allows it to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Now create admin policies using the helper function
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update any user profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete any user profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());