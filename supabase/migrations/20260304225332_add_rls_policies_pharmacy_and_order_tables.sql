/*
  # Add RLS policies to pharmacy and order tables

  Tables covered:
    - `pharmacy_business_hours` - Pharmacy schedule by day
    - `pharmacy_delivery_zones` - Delivery coverage areas
    - `pharmacy_insurance_claims` - Insurance claim submissions
    - `pharmacy_licenses` - Pharmacy license documents
    - `pharmacy_refunds` - Refund records
    - `order_items` - Line items in pharmacy orders
    - `order_deliveries` - Delivery tracking for orders
    - `order_notes` - Staff notes on orders
    - `order_status_history` - Order status change log
    - `courier_assignments` - Delivery courier assignments
    - `delivery_quotes` - Delivery service price quotes
    - `external_deliveries` - Third-party delivery tracking
    - `inventory_categories` - Product categories (reference data)
    - `inventory_transactions` - Inventory stock movements
    - `product_images` - Product photos
    - `insurance_plans` - Insurance plan reference data
    - `verification_documents` - Pharmacy verification docs
    - `staff_schedules` - Staff shift schedules

  Policy pattern:
    - Pharmacy owner/staff can manage their own data
    - Patients can view their own order-related data
    - Admins can SELECT all
*/

-- pharmacy_business_hours
CREATE POLICY "Authenticated users can view pharmacy hours"
  ON pharmacy_business_hours FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_business_hours.pharmacy_id AND pharmacies.is_active = true
  ));

CREATE POLICY "Pharmacy owners can insert hours"
  ON pharmacy_business_hours FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_business_hours.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update hours"
  ON pharmacy_business_hours FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_business_hours.pharmacy_id AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_business_hours.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all pharmacy hours"
  ON pharmacy_business_hours FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- pharmacy_delivery_zones
CREATE POLICY "Authenticated users can view delivery zones"
  ON pharmacy_delivery_zones FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_delivery_zones.pharmacy_id AND pharmacies.is_active = true
  ));

CREATE POLICY "Pharmacy owners can manage delivery zones"
  ON pharmacy_delivery_zones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_delivery_zones.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update delivery zones"
  ON pharmacy_delivery_zones FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_delivery_zones.pharmacy_id AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_delivery_zones.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can delete delivery zones"
  ON pharmacy_delivery_zones FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_delivery_zones.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

-- pharmacy_insurance_claims
CREATE POLICY "Pharmacy owners can view own claims"
  ON pharmacy_insurance_claims FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_insurance_claims.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can insert claims"
  ON pharmacy_insurance_claims FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_insurance_claims.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update claims"
  ON pharmacy_insurance_claims FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_insurance_claims.pharmacy_id AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_insurance_claims.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view their insurance claims"
  ON pharmacy_insurance_claims FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = pharmacy_insurance_claims.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all pharmacy claims"
  ON pharmacy_insurance_claims FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- pharmacy_licenses
CREATE POLICY "Pharmacy owners can view own licenses"
  ON pharmacy_licenses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_licenses.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can insert licenses"
  ON pharmacy_licenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_licenses.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update licenses"
  ON pharmacy_licenses FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_licenses.pharmacy_id AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_licenses.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all pharmacy licenses"
  ON pharmacy_licenses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- pharmacy_refunds
CREATE POLICY "Pharmacy owners can view own refunds"
  ON pharmacy_refunds FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_refunds.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can insert refunds"
  ON pharmacy_refunds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_refunds.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update refunds"
  ON pharmacy_refunds FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_refunds.pharmacy_id AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = pharmacy_refunds.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all pharmacy refunds"
  ON pharmacy_refunds FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- order_items (child of pharmacy_orders)
CREATE POLICY "Pharmacy owners can view order items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_items.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can insert order items"
  ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_items.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own order items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN patients p ON p.id = po.patient_id
    WHERE po.id = order_items.order_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- order_deliveries
CREATE POLICY "Pharmacy owners can view order deliveries"
  ON order_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_deliveries.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can manage order deliveries"
  ON order_deliveries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_deliveries.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update order deliveries"
  ON order_deliveries FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_deliveries.order_id
    AND ph.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_deliveries.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own order deliveries"
  ON order_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN patients p ON p.id = po.patient_id
    WHERE po.id = order_deliveries.order_id
    AND p.user_id = auth.uid()
  ));

-- order_notes
CREATE POLICY "Pharmacy owners can view order notes"
  ON order_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_notes.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy staff can insert order notes"
  ON order_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_notes.order_id
    AND ph.user_id = auth.uid()
  ));

-- order_status_history
CREATE POLICY "Pharmacy owners can view order status history"
  ON order_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = order_status_history.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own order status history"
  ON order_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN patients p ON p.id = po.patient_id
    WHERE po.id = order_status_history.order_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "System can insert order status history"
  ON order_status_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- courier_assignments
CREATE POLICY "Pharmacy owners can view courier assignments"
  ON courier_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = courier_assignments.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can manage courier assignments"
  ON courier_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = courier_assignments.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update courier assignments"
  ON courier_assignments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = courier_assignments.order_id
    AND ph.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = courier_assignments.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view own courier assignments"
  ON courier_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN patients p ON p.id = po.patient_id
    WHERE po.id = courier_assignments.order_id
    AND p.user_id = auth.uid()
  ));

-- delivery_quotes
CREATE POLICY "Pharmacy owners can view delivery quotes"
  ON delivery_quotes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = delivery_quotes.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "System can insert delivery quotes"
  ON delivery_quotes FOR INSERT TO authenticated
  WITH CHECK (true);

-- external_deliveries
CREATE POLICY "Pharmacy owners can view external deliveries"
  ON external_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.id = external_deliveries.order_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "System can insert external deliveries"
  ON external_deliveries FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update external deliveries"
  ON external_deliveries FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Patients can view own external deliveries"
  ON external_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_orders po
    JOIN patients p ON p.id = po.patient_id
    WHERE po.id = external_deliveries.order_id
    AND p.user_id = auth.uid()
  ));

-- inventory_categories (reference data)
CREATE POLICY "Authenticated users can view inventory categories"
  ON inventory_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage inventory categories"
  ON inventory_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update inventory categories"
  ON inventory_categories FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Pharmacy owners can manage inventory categories"
  ON inventory_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.user_id = auth.uid()
  ));

-- inventory_transactions
CREATE POLICY "Pharmacy owners can view own inventory transactions"
  ON inventory_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = inventory_transactions.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can insert inventory transactions"
  ON inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = inventory_transactions.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all inventory transactions"
  ON inventory_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- product_images (linked to pharmacy_inventory)
CREATE POLICY "Authenticated users can view product images"
  ON product_images FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Pharmacy owners can manage product images"
  ON product_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_inventory pi
    JOIN pharmacies ph ON ph.id = pi.pharmacy_id
    WHERE pi.id = product_images.inventory_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can update product images"
  ON product_images FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_inventory pi
    JOIN pharmacies ph ON ph.id = pi.pharmacy_id
    WHERE pi.id = product_images.inventory_id
    AND ph.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacy_inventory pi
    JOIN pharmacies ph ON ph.id = pi.pharmacy_id
    WHERE pi.id = product_images.inventory_id
    AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can delete product images"
  ON product_images FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacy_inventory pi
    JOIN pharmacies ph ON ph.id = pi.pharmacy_id
    WHERE pi.id = product_images.inventory_id
    AND ph.user_id = auth.uid()
  ));

-- insurance_plans (reference data)
CREATE POLICY "Authenticated users can view insurance plans"
  ON insurance_plans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage insurance plans"
  ON insurance_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update insurance plans"
  ON insurance_plans FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- verification_documents (pharmacy)
CREATE POLICY "Pharmacy owners can view own verification docs"
  ON verification_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = verification_documents.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacy owners can upload verification docs"
  ON verification_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies WHERE pharmacies.id = verification_documents.pharmacy_id AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all verification docs"
  ON verification_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update verification docs"
  ON verification_documents FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- staff_schedules
CREATE POLICY "Staff can view own schedules"
  ON staff_schedules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM staff_members WHERE staff_members.id = staff_schedules.staff_id AND staff_members.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all staff schedules"
  ON staff_schedules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage staff schedules"
  ON staff_schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update staff schedules"
  ON staff_schedules FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));
