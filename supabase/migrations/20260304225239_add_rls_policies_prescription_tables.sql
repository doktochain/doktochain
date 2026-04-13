/*
  # Add RLS policies to prescription-related tables

  Tables covered:
    - `prescription_items` - Line items within a prescription
    - `prescription_refills` - Refill requests and approvals
    - `prescription_rejections` - Pharmacy rejection records
    - `prescription_audit_log` - Audit trail for prescription changes
    - `billing_transactions` - Financial transactions

  Policy pattern:
    - Access follows parent prescription/order ownership
    - Patients, providers, pharmacies each see their own records
    - Admins can SELECT all
*/

-- prescription_items (child of prescriptions)
CREATE POLICY "Patients can view own prescription items"
  ON prescription_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_items.prescription_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view prescription items they wrote"
  ON prescription_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_items.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert prescription items"
  ON prescription_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_items.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update prescription items"
  ON prescription_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_items.prescription_id
    AND pv.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_items.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all prescription items"
  ON prescription_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- prescription_refills
CREATE POLICY "Patients can view own prescription refills"
  ON prescription_refills FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_refills.prescription_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Patients can request refills"
  ON prescription_refills FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_refills.prescription_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view refills for their prescriptions"
  ON prescription_refills FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_refills.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Providers can approve or deny refills"
  ON prescription_refills FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_refills.prescription_id
    AND pv.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_refills.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacies can view refills assigned to them"
  ON prescription_refills FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = prescription_refills.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacies can update refill status"
  ON prescription_refills FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = prescription_refills.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = prescription_refills.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

-- prescription_rejections
CREATE POLICY "Pharmacies can view own rejections"
  ON prescription_rejections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = prescription_rejections.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Pharmacies can insert rejections"
  ON prescription_rejections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pharmacies
    WHERE pharmacies.id = prescription_rejections.pharmacy_id
    AND pharmacies.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view rejections for their prescriptions"
  ON prescription_rejections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_rejections.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view rejections for their prescriptions"
  ON prescription_rejections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_rejections.prescription_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all prescription rejections"
  ON prescription_rejections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- prescription_audit_log (system-generated)
CREATE POLICY "Providers can view audit log for their prescriptions"
  ON prescription_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN providers pv ON pv.id = pr.provider_id
    WHERE pr.id = prescription_audit_log.prescription_id
    AND pv.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view audit log for their prescriptions"
  ON prescription_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_audit_log.prescription_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "System can insert prescription audit log"
  ON prescription_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all prescription audit logs"
  ON prescription_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- billing_transactions
CREATE POLICY "Users can view own billing transactions"
  ON billing_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Providers can view their billing transactions"
  ON billing_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers WHERE providers.id = billing_transactions.provider_id AND providers.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view their billing transactions"
  ON billing_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = billing_transactions.patient_id AND patients.user_id = auth.uid()
  ));

CREATE POLICY "System can insert billing transactions"
  ON billing_transactions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all billing transactions"
  ON billing_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));
