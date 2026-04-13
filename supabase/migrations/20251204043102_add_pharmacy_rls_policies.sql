/*
  # Row Level Security Policies for Pharmacy Management System
  
  ## Security
  All new tables have RLS enabled with policies restricting access based on 
  pharmacy ownership and staff roles.
*/

-- Enable RLS on all tables
ALTER TABLE pharmacy_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_formularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

-- Pharmacy Staff Policies
CREATE POLICY "Pharmacy staff can view own pharmacy staff"
  ON pharmacy_staff FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy managers can manage staff"
  ON pharmacy_staff FOR ALL
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_manage_staff = true
    )
  );

-- Inventory Policies
CREATE POLICY "Pharmacy staff can view inventory"
  ON pharmacy_inventory FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized staff can manage inventory"
  ON pharmacy_inventory FOR ALL
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_manage_inventory = true
    )
  );

-- Order Policies
CREATE POLICY "Pharmacy staff can view orders"
  ON pharmacy_orders FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    ) OR
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy staff can update orders"
  ON pharmacy_orders FOR UPDATE
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

-- Prescription Validation Policies
CREATE POLICY "Pharmacists can manage validations"
  ON prescription_validations FOR ALL
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND staff_role IN ('pharmacist', 'pharmacy-manager')
    )
  );

-- Transaction Policies
CREATE POLICY "Authorized staff can view transactions"
  ON pharmacy_transactions FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_process_payments = true
    )
  );

CREATE POLICY "Authorized staff can create transactions"
  ON pharmacy_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_process_payments = true
    )
  );

-- Supplier Policies (viewable by all authenticated users for ordering)
CREATE POLICY "All authenticated users can view suppliers"
  ON product_suppliers FOR SELECT
  TO authenticated
  USING (true);

-- Insurance Formulary Policies (public read for checking coverage)
CREATE POLICY "Authenticated users can view formularies"
  ON insurance_formularies FOR SELECT
  TO authenticated
  USING (true);

-- Order Fulfillment Policies
CREATE POLICY "Pharmacy staff can view fulfillment"
  ON order_fulfillment FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy staff can manage fulfillment"
  ON order_fulfillment FOR ALL
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid()
    )
  );

-- Delivery Integration Policies
CREATE POLICY "Pharmacy managers can manage delivery integrations"
  ON delivery_integrations FOR ALL
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_manage_staff = true
    )
  );

-- Payment Gateway Policies
CREATE POLICY "Pharmacy managers can manage payment gateways"
  ON payment_gateways FOR ALL
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM pharmacy_staff
      WHERE user_id = auth.uid() AND can_manage_staff = true
    )
  );
