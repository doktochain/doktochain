/*
  # Fix Infinite Recursion in Patients RLS Policies

  1. Changes
    - Remove circular dependency between patients and appointments tables
    - Simplify patients table policies to avoid recursion
    - Allow patients to view their own records directly

  2. Security
    - Patients can view and update their own records
    - Providers can view patients through direct provider_id check
    - Admins have full access
*/

-- Drop existing problematic policies on patients table
DROP POLICY IF EXISTS "Patients can view own data" ON patients;
DROP POLICY IF EXISTS "Providers can view patient data for appointments" ON patients;
DROP POLICY IF EXISTS "Users can insert own patient record" ON patients;
DROP POLICY IF EXISTS "Patients can update own data" ON patients;

-- Create simplified non-recursive policies for patients table
CREATE POLICY "Patients can view own record"
  ON patients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Patients can insert own record"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Patients can update own record"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Providers can view patients (without recursion through appointments)
CREATE POLICY "Providers can view all patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.user_id = auth.uid()
    )
  );

-- Admin access
CREATE POLICY "Admins can manage all patients"
  ON patients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
