/*
  # Fix Specialties Master RLS Policies

  1. Changes
    - Add INSERT, UPDATE, DELETE policies for admins on specialties_master table
    
  2. Security
    - Only admins can manage specialties
    - Everyone can view active specialties
*/

-- Add admin policies for specialties_master
CREATE POLICY "Admins can insert specialties"
  ON specialties_master
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update specialties"
  ON specialties_master
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete specialties"
  ON specialties_master
  FOR DELETE
  TO authenticated
  USING (is_admin());