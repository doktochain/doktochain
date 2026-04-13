/*
  # Fix Pharmacy Staff RLS Infinite Recursion & Related Policy Issues

  1. New Functions
    - `get_user_pharmacy_ids_as_staff(uuid)` - SECURITY DEFINER function that bypasses RLS
      to look up which pharmacy IDs a user belongs to in pharmacy_staff
    - `get_user_pharmacy_ids_as_manager(uuid)` - same but filtered to can_manage_staff
    - `get_user_pharmacy_ids_as_inventory_manager(uuid)` - filtered to can_manage_inventory
    - `get_user_pharmacy_ids_as_prescription_staff(uuid)` - filtered to can_approve_prescriptions

  2. Fixed Tables - pharmacy_staff
    - Drop self-referencing SELECT/INSERT/UPDATE/DELETE policies
    - Replace with policies using SECURITY DEFINER helpers

  3. Fixed Tables - pharmacy_inventory
    - Add pharmacy owner CRUD policies (were missing)
    - Replace staff policies with helper function versions

  4. Fixed Tables - order_fulfillment
    - Add pharmacy owner policies (were missing)
    - Replace staff policies with helper function versions

  5. Fixed Tables - pharmacy_orders
    - Replace staff policies with helper function versions

  6. Fixed Tables - patients
    - Add pharmacy owner SELECT policy for order-linked patients

  7. Fixed Tables - prescriptions, prescription_pharmacies, prescription_refill_requests,
     prescription_fills, prescription_validations, delivery_integrations, payment_gateways,
     external_deliveries, pharmacy_transactions
    - Replace all pharmacy_staff subquery policies with helper function versions

  8. Important Notes
    - Root cause: pharmacy_staff RLS policies queried pharmacy_staff itself = infinite recursion
    - SECURITY DEFINER functions bypass RLS on lookup, breaking the cycle
    - All other tables referencing pharmacy_staff in their policies were also affected
*/

-- Step 1: Create SECURITY DEFINER helper functions

CREATE OR REPLACE FUNCTION get_user_pharmacy_ids_as_staff(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION get_user_pharmacy_ids_as_manager(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = user_uuid AND can_manage_staff = true;
$$;

CREATE OR REPLACE FUNCTION get_user_pharmacy_ids_as_inventory_manager(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = user_uuid AND can_manage_inventory = true;
$$;

CREATE OR REPLACE FUNCTION get_user_pharmacy_ids_as_prescription_staff(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = user_uuid AND can_approve_prescriptions = true;
$$;

-- Step 2: Fix pharmacy_staff policies

DROP POLICY IF EXISTS "Pharmacy staff can view own pharmacy staff" ON pharmacy_staff;
DROP POLICY IF EXISTS "Pharmacy managers can select staff" ON pharmacy_staff;
DROP POLICY IF EXISTS "Pharmacy managers can insert staff" ON pharmacy_staff;
DROP POLICY IF EXISTS "Pharmacy managers can update staff" ON pharmacy_staff;
DROP POLICY IF EXISTS "Pharmacy managers can delete staff" ON pharmacy_staff;

CREATE POLICY "Staff can view own pharmacy colleagues"
  ON pharmacy_staff FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

CREATE POLICY "Managers can select staff"
  ON pharmacy_staff FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid())));

CREATE POLICY "Managers can insert staff"
  ON pharmacy_staff FOR INSERT
  TO authenticated
  WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid())));

CREATE POLICY "Managers can update staff"
  ON pharmacy_staff FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid())))
  WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid())));

CREATE POLICY "Managers can delete staff"
  ON pharmacy_staff FOR DELETE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid())));

-- Step 3: Fix pharmacy_inventory policies

DROP POLICY IF EXISTS "Authorized staff can select inventory" ON pharmacy_inventory;
DROP POLICY IF EXISTS "Authorized staff can insert inventory" ON pharmacy_inventory;
DROP POLICY IF EXISTS "Authorized staff can update inventory" ON pharmacy_inventory;
DROP POLICY IF EXISTS "Authorized staff can delete inventory" ON pharmacy_inventory;
DROP POLICY IF EXISTS "Pharmacy staff can view inventory" ON pharmacy_inventory;

CREATE POLICY "Pharmacy owners can view all inventory"
  ON pharmacy_inventory FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacy owners can insert inventory"
  ON pharmacy_inventory FOR INSERT
  TO authenticated
  WITH CHECK (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacy owners can update inventory"
  ON pharmacy_inventory FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()))
  WITH CHECK (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacy owners can delete inventory"
  ON pharmacy_inventory FOR DELETE
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

CREATE POLICY "Inventory managers can view inventory"
  ON pharmacy_inventory FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_inventory_manager(auth.uid())));

CREATE POLICY "Inventory managers can insert inventory"
  ON pharmacy_inventory FOR INSERT
  TO authenticated
  WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_inventory_manager(auth.uid())));

CREATE POLICY "Inventory managers can update inventory"
  ON pharmacy_inventory FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_inventory_manager(auth.uid())))
  WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_inventory_manager(auth.uid())));

CREATE POLICY "Inventory managers can delete inventory"
  ON pharmacy_inventory FOR DELETE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_inventory_manager(auth.uid())));

CREATE POLICY "Staff can view pharmacy inventory"
  ON pharmacy_inventory FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

-- Step 4: Fix order_fulfillment policies

DROP POLICY IF EXISTS "Pharmacy staff can manage fulfillment" ON order_fulfillment;
DROP POLICY IF EXISTS "Pharmacy staff can view fulfillment" ON order_fulfillment;

CREATE POLICY "Pharmacy owners can view fulfillment"
  ON order_fulfillment FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacy owners can manage fulfillment"
  ON order_fulfillment FOR ALL
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()))
  WITH CHECK (pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid()));

CREATE POLICY "Staff can view fulfillment records"
  ON order_fulfillment FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

CREATE POLICY "Staff can manage fulfillment records"
  ON order_fulfillment FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())))
  WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

-- Step 5: Fix pharmacy_orders staff policies

DROP POLICY IF EXISTS "Pharmacy staff can view orders" ON pharmacy_orders;
DROP POLICY IF EXISTS "Pharmacy staff can update orders" ON pharmacy_orders;

CREATE POLICY "Staff can view pharmacy orders"
  ON pharmacy_orders FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

CREATE POLICY "Staff can update pharmacy orders"
  ON pharmacy_orders FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

-- Step 6: Add pharmacy owner SELECT on patients table

CREATE POLICY "Pharmacy owners can view patients with orders"
  ON patients FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT po.patient_id FROM pharmacy_orders po
      WHERE po.pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    )
  );

-- Step 7: Fix prescriptions staff policies

DROP POLICY IF EXISTS "Pharmacy staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Pharmacy staff can update prescriptions" ON prescriptions;

CREATE POLICY "Staff can view pharmacy prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

CREATE POLICY "Staff can update pharmacy prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

-- Fix prescription_pharmacies staff policy
DROP POLICY IF EXISTS "Pharmacy staff can view prescription pharmacies" ON prescription_pharmacies;

CREATE POLICY "Staff can view prescription pharmacies"
  ON prescription_pharmacies FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

-- Fix prescription_refill_requests staff policies
DROP POLICY IF EXISTS "Pharmacy staff can view refill requests" ON prescription_refill_requests;
DROP POLICY IF EXISTS "Pharmacy staff can update refill requests" ON prescription_refill_requests;

CREATE POLICY "Staff can view pharmacy refill requests"
  ON prescription_refill_requests FOR SELECT
  TO authenticated
  USING (
    prescription_id IN (
      SELECT pp.prescription_id FROM prescription_pharmacies pp
      WHERE pp.pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid()))
    )
  );

CREATE POLICY "Prescription staff can update refill requests"
  ON prescription_refill_requests FOR UPDATE
  TO authenticated
  USING (
    prescription_id IN (
      SELECT pp.prescription_id FROM prescription_pharmacies pp
      WHERE pp.pharmacy_id IN (SELECT get_user_pharmacy_ids_as_prescription_staff(auth.uid()))
    )
  )
  WITH CHECK (
    prescription_id IN (
      SELECT pp.prescription_id FROM prescription_pharmacies pp
      WHERE pp.pharmacy_id IN (SELECT get_user_pharmacy_ids_as_prescription_staff(auth.uid()))
    )
  );

-- Fix prescription_fills staff policy
DROP POLICY IF EXISTS "Pharmacy staff can view fills" ON prescription_fills;

CREATE POLICY "Staff can view prescription fills"
  ON prescription_fills FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid())));

-- Fix prescription_validations staff policy
DROP POLICY IF EXISTS "Pharmacists can manage validations" ON prescription_validations;

CREATE POLICY "Pharmacists can manage prescription validations"
  ON prescription_validations FOR ALL
  TO authenticated
  USING (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_prescription_staff(auth.uid())))
  WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids_as_prescription_staff(auth.uid())));

-- Step 8: Fix delivery_integrations policies
DROP POLICY IF EXISTS "Pharmacy managers can select delivery integrations" ON delivery_integrations;
DROP POLICY IF EXISTS "Pharmacy managers can update delivery integrations" ON delivery_integrations;
DROP POLICY IF EXISTS "Pharmacy managers can delete delivery integrations" ON delivery_integrations;

CREATE POLICY "Owners and managers can view delivery integrations"
  ON delivery_integrations FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid()))
  );

CREATE POLICY "Owners and managers can update delivery integrations"
  ON delivery_integrations FOR UPDATE
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid()))
  );

CREATE POLICY "Owners and managers can delete delivery integrations"
  ON delivery_integrations FOR DELETE
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid()))
  );

-- Fix payment_gateways policies
DROP POLICY IF EXISTS "Pharmacy managers can select payment gateways" ON payment_gateways;
DROP POLICY IF EXISTS "Pharmacy managers can update payment gateways" ON payment_gateways;
DROP POLICY IF EXISTS "Pharmacy managers can delete payment gateways" ON payment_gateways;

CREATE POLICY "Owners and managers can view payment gateways"
  ON payment_gateways FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid()))
  );

CREATE POLICY "Owners and managers can update payment gateways"
  ON payment_gateways FOR UPDATE
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid()))
  );

CREATE POLICY "Owners and managers can delete payment gateways"
  ON payment_gateways FOR DELETE
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_manager(auth.uid()))
  );

-- Fix external_deliveries staff policy (uses order_id, not pharmacy_id)
DROP POLICY IF EXISTS "Pharmacy staff can update external deliveries" ON external_deliveries;

CREATE POLICY "Staff can update external deliveries"
  ON external_deliveries FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT po.id FROM pharmacy_orders po
      WHERE po.pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
         OR po.pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid()))
    )
  );

-- Fix pharmacy_transactions staff policy
DROP POLICY IF EXISTS "Authorized staff can view transactions" ON pharmacy_transactions;

CREATE POLICY "Owners and staff can view transactions"
  ON pharmacy_transactions FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (SELECT id FROM pharmacies WHERE user_id = auth.uid())
    OR pharmacy_id IN (SELECT get_user_pharmacy_ids_as_staff(auth.uid()))
  );
