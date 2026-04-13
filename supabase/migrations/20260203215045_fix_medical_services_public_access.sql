/*
  # Fix Medical Services Public Access
  
  1. Changes
    - Add public (anon) read access to medical_services table
    - This allows the homepage searchbar to work for non-logged-in users
    
  2. Security
    - Only SELECT access for active, non-deleted services
    - Write operations still require authentication and admin role
*/

-- Drop existing policy and recreate with public access
DROP POLICY IF EXISTS "Public can view active services" ON medical_services;

CREATE POLICY "Public can view active services"
  ON medical_services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);
