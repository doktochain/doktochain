/*
  # Add RLS Policies for Pharmacy Prescription Access

  1. New Policies
    - Allow pharmacy owners/staff to view prescriptions sent to their pharmacy
    - Allow pharmacy owners/staff to view prescription pharmacies for their pharmacy
    - Allow pharmacy owners/staff to view prescription fills for their pharmacy
    
  2. Security
    - Access is granted through prescription_pharmacies join table
    - Pharmacy owners access through pharmacies table
    - Staff access through pharmacy_staff table with proper permissions
*/

-- Enable RLS on prescription tables if not already enabled
DO $$ BEGIN
  ALTER TABLE prescription_pharmacies ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE prescription_fills ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Prescription Pharmacies Policies
CREATE POLICY "Pharmacy owners can view prescription pharmacies"
  ON prescription_pharmacies FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy staff can view prescription pharmacies"
  ON prescription_pharmacies FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

-- Prescriptions Policies (through prescription_pharmacies)
CREATE POLICY "Pharmacy owners can view prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT id FROM pharmacies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Pharmacy staff can view prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
      )
    )
  );

-- Prescription Fills Policies
CREATE POLICY "Pharmacy owners can view fills"
  ON prescription_fills FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy staff can view fills"
  ON prescription_fills FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy owners can create fills"
  ON prescription_fills FOR INSERT
  TO authenticated
  WITH CHECK (
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy staff can create fills"
  ON prescription_fills FOR INSERT
  TO authenticated
  WITH CHECK (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_approve_prescriptions = true
    )
  );

-- Allow pharmacy staff to update prescriptions they can access
CREATE POLICY "Pharmacy staff can update prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff
        WHERE user_id = auth.uid() AND can_approve_prescriptions = true
      )
    )
  )
  WITH CHECK (
    id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff
        WHERE user_id = auth.uid() AND can_approve_prescriptions = true
      )
    )
  );

CREATE POLICY "Pharmacy owners can update prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT id FROM pharmacies WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT id FROM pharmacies WHERE user_id = auth.uid()
      )
    )
  );

-- Prescription Refill Requests Policies (using prescription link)
CREATE POLICY "Pharmacy owners can view refill requests"
  ON prescription_refill_requests FOR SELECT
  TO authenticated
  USING (
    prescription_id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT id FROM pharmacies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Pharmacy staff can view refill requests"
  ON prescription_refill_requests FOR SELECT
  TO authenticated
  USING (
    prescription_id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Pharmacy staff can update refill requests"
  ON prescription_refill_requests FOR UPDATE
  TO authenticated
  USING (
    prescription_id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff
        WHERE user_id = auth.uid() AND can_approve_prescriptions = true
      )
    )
  )
  WITH CHECK (
    prescription_id IN (
      SELECT prescription_id FROM prescription_pharmacies
      WHERE pharmacy_id IN (
        SELECT pharmacy_id FROM pharmacy_staff
        WHERE user_id = auth.uid() AND can_approve_prescriptions = true
      )
    )
  );
