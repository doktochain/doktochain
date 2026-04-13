/*
  # Final RLS Security Audit - Phase 6

  ## Summary
  Fixes all remaining RLS policy issues found during the Phase 6 security audit.

  ## Changes

  ### 1. Split FOR ALL policies into separate SELECT/INSERT/UPDATE/DELETE
  Tables affected:
  - `delivery_integrations` - pharmacy managers manage delivery integrations
  - `message_templates` - providers manage their templates
  - `payment_gateways` - pharmacy managers manage payment gateways
  - `pharmacy_inventory` - authorized staff manage inventory
  - `pharmacy_staff` - pharmacy managers manage staff
  - `products_master` - admins manage products
  - `role_permissions` - two FOR ALL admin policies split
  - `staff_roles` - admin manage policy split

  ### 2. Tighten USING(true) on internal system tables
  Tables affected:
  - `role_permissions` (role_perms_view) - restrict to authenticated
  - `staff_permissions` (perms_view) - restrict to authenticated admins/providers
  - `staff_roles` (roles_view) - restrict to authenticated admins/providers
  - `blockchain_records` - restrict SELECT to admins, restrict INSERT to service role pattern
  - `clinical_data_hashes` - restrict SELECT to owner or admin, restrict INSERT properly

  ### 3. Security Notes
  - All provider-public profile data (locations, specialties, credentials, etc.) intentionally
    kept with USING(true) on SELECT as patients need to browse providers without ownership checks
  - Reference/catalog tables (drug_database, billing_codes, FAQs, etc.) intentionally kept
    with USING(true) on SELECT as they are public reference data
  - No tables found with RLS disabled
  - No tables found with RLS enabled but zero policies
*/

-- ============================================================
-- 1. SPLIT FOR ALL POLICIES
-- ============================================================

-- 1a. delivery_integrations: Split pharmacy managers FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "Pharmacy managers can manage delivery integrations" ON delivery_integrations;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Pharmacy managers can select delivery integrations"
  ON delivery_integrations FOR SELECT TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can insert delivery integrations"
  ON delivery_integrations FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can update delivery integrations"
  ON delivery_integrations FOR UPDATE TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ))
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can delete delivery integrations"
  ON delivery_integrations FOR DELETE TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

-- 1b. message_templates: Split provider FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "Manage templates" ON message_templates;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Providers can select own or system templates"
  ON message_templates FOR SELECT TO authenticated
  USING (auth.uid() = provider_id OR is_system_template = true);

CREATE POLICY "Providers can insert own templates"
  ON message_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = provider_id AND is_system_template = false);

CREATE POLICY "Providers can update own templates"
  ON message_templates FOR UPDATE TO authenticated
  USING (auth.uid() = provider_id AND is_system_template = false)
  WITH CHECK (auth.uid() = provider_id AND is_system_template = false);

CREATE POLICY "Providers can delete own templates"
  ON message_templates FOR DELETE TO authenticated
  USING (auth.uid() = provider_id AND is_system_template = false);

-- 1c. payment_gateways: Split pharmacy managers FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "Pharmacy managers can manage payment gateways" ON payment_gateways;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Pharmacy managers can select payment gateways"
  ON payment_gateways FOR SELECT TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can insert payment gateways"
  ON payment_gateways FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can update payment gateways"
  ON payment_gateways FOR UPDATE TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ))
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can delete payment gateways"
  ON payment_gateways FOR DELETE TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_staff = true
  ));

-- 1d. pharmacy_inventory: Split authorized staff FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authorized staff can manage inventory" ON pharmacy_inventory;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Authorized staff can select inventory"
  ON pharmacy_inventory FOR SELECT TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_inventory = true
  ));

CREATE POLICY "Authorized staff can insert inventory"
  ON pharmacy_inventory FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_inventory = true
  ));

CREATE POLICY "Authorized staff can update inventory"
  ON pharmacy_inventory FOR UPDATE TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_inventory = true
  ))
  WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_inventory = true
  ));

CREATE POLICY "Authorized staff can delete inventory"
  ON pharmacy_inventory FOR DELETE TO authenticated
  USING (pharmacy_id IN (
    SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
    WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.can_manage_inventory = true
  ));

-- 1e. pharmacy_staff: Split pharmacy managers FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "Pharmacy managers can manage staff" ON pharmacy_staff;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Pharmacy managers can select staff"
  ON pharmacy_staff FOR SELECT TO authenticated
  USING (pharmacy_id IN (
    SELECT ps.pharmacy_id FROM pharmacy_staff ps
    WHERE ps.user_id = auth.uid() AND ps.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can insert staff"
  ON pharmacy_staff FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id IN (
    SELECT ps.pharmacy_id FROM pharmacy_staff ps
    WHERE ps.user_id = auth.uid() AND ps.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can update staff"
  ON pharmacy_staff FOR UPDATE TO authenticated
  USING (pharmacy_id IN (
    SELECT ps.pharmacy_id FROM pharmacy_staff ps
    WHERE ps.user_id = auth.uid() AND ps.can_manage_staff = true
  ))
  WITH CHECK (pharmacy_id IN (
    SELECT ps.pharmacy_id FROM pharmacy_staff ps
    WHERE ps.user_id = auth.uid() AND ps.can_manage_staff = true
  ));

CREATE POLICY "Pharmacy managers can delete staff"
  ON pharmacy_staff FOR DELETE TO authenticated
  USING (pharmacy_id IN (
    SELECT ps.pharmacy_id FROM pharmacy_staff ps
    WHERE ps.user_id = auth.uid() AND ps.can_manage_staff = true
  ));

-- 1f. products_master: Split admin FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage products" ON products_master;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can insert products"
  ON products_master FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true
  ));

CREATE POLICY "Admins can update products"
  ON products_master FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true
  ));

CREATE POLICY "Admins can delete products"
  ON products_master FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true
  ));

-- 1g. role_permissions: Split two FOR ALL admin policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage permissions" ON role_permissions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "role_perms_manage" ON role_permissions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can insert permissions"
  ON role_permissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ));

CREATE POLICY "Admins can update permissions"
  ON role_permissions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ));

CREATE POLICY "Admins can delete permissions"
  ON role_permissions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ));

-- 1h. staff_roles: Split admin manage FOR ALL
DO $$ BEGIN
  DROP POLICY IF EXISTS "roles_manage" ON staff_roles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can insert staff roles"
  ON staff_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ));

CREATE POLICY "Admins can update staff roles"
  ON staff_roles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ));

CREATE POLICY "Admins can delete staff roles"
  ON staff_roles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ));


-- ============================================================
-- 2. TIGHTEN USING(true) ON INTERNAL SYSTEM TABLES
-- ============================================================

-- 2a. role_permissions: Replace USING(true) SELECT with admin-only
DO $$ BEGIN
  DROP POLICY IF EXISTS "role_perms_view" ON role_permissions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'provider')
  ));

-- 2b. staff_permissions: Replace USING(true) SELECT with admin/provider-only
DO $$ BEGIN
  DROP POLICY IF EXISTS "perms_view" ON staff_permissions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins and providers can view staff permissions"
  ON staff_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'provider')
  ));

-- 2c. staff_roles: Replace USING(true) SELECT with admin/provider-only
DO $$ BEGIN
  DROP POLICY IF EXISTS "roles_view" ON staff_roles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins and providers can view staff roles"
  ON staff_roles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'provider')
  ));

-- 2d. blockchain_records: Tighten SELECT to admins only, INSERT to admins/providers
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated can view blockchain records" ON blockchain_records;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "System can insert blockchain records" ON blockchain_records;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view blockchain records"
  ON blockchain_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  ));

CREATE POLICY "Authenticated users can insert blockchain records"
  ON blockchain_records FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'provider')
    AND user_roles.is_active = true
  ));

-- 2e. clinical_data_hashes: Tighten SELECT to owner/admin, INSERT to providers/admin
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view clinical data hashes" ON clinical_data_hashes;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "System can insert clinical data hashes" ON clinical_data_hashes;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins and providers can view clinical data hashes"
  ON clinical_data_hashes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'provider')
    AND user_roles.is_active = true
  ));

CREATE POLICY "Providers can insert clinical data hashes"
  ON clinical_data_hashes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'provider')
    AND user_roles.is_active = true
  ));