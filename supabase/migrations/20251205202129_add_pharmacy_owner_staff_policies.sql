/*
  # Add Pharmacy Owner Staff Management Policies

  1. New Policies
    - Allow pharmacy owners to view their staff
    - Allow pharmacy owners to manage their staff (insert, update, delete)
    
  2. Security
    - Pharmacy owners are identified through the pharmacies table
    - This enables owners to manage staff even if they're not in pharmacy_staff themselves
*/

-- Allow pharmacy owners to view their pharmacy's staff
CREATE POLICY "Pharmacy owners can view their staff"
  ON pharmacy_staff FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

-- Allow pharmacy owners to insert staff into their pharmacy
CREATE POLICY "Pharmacy owners can add staff"
  ON pharmacy_staff FOR INSERT
  TO authenticated
  WITH CHECK (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

-- Allow pharmacy owners to update their pharmacy staff
CREATE POLICY "Pharmacy owners can update staff"
  ON pharmacy_staff FOR UPDATE
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

-- Allow pharmacy owners to delete their pharmacy staff
CREATE POLICY "Pharmacy owners can delete staff"
  ON pharmacy_staff FOR DELETE
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );
