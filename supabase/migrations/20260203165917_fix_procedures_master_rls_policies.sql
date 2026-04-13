/*
  # Fix Procedures Master RLS Policies

  1. Changes
    - Add INSERT, UPDATE, DELETE policies for admins on procedures_master table
    - Add SELECT policy for everyone to view active procedures
    
  2. Security
    - Only admins can manage procedures
    - Everyone can view active procedures
*/

-- Enable RLS on procedures_master if not already enabled
ALTER TABLE procedures_master ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view active procedures" ON procedures_master;
DROP POLICY IF EXISTS "Admins can insert procedures" ON procedures_master;
DROP POLICY IF EXISTS "Admins can update procedures" ON procedures_master;
DROP POLICY IF EXISTS "Admins can delete procedures" ON procedures_master;

-- Add policies
CREATE POLICY "Anyone can view active procedures"
  ON procedures_master
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can insert procedures"
  ON procedures_master
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update procedures"
  ON procedures_master
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete procedures"
  ON procedures_master
  FOR DELETE
  TO authenticated
  USING (is_admin());