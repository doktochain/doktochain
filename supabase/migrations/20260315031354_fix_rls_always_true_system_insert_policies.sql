/*
  # Fix RLS Always True System INSERT Policies

  ## Summary
  19 tables have system INSERT policies using WITH CHECK (true), allowing any authenticated
  user to insert records into system/audit tables. This bypasses row-level security for those
  tables. The fix changes these policies to restrict inserts to service_role only, since these
  records are created by system triggers and backend functions, not by end users directly.

  ## Tables Fixed
  - appointment_status_history
  - audit_failures
  - billing_transactions
  - blockchain_audit_log
  - custom_table_audit_log
  - delivery_quotes
  - email_verification_codes
  - external_deliveries
  - fhir_sync_logs
  - marketplace_transaction_logs
  - notification_delivery_logs
  - order_status_history
  - phone_verification_codes
  - prescription_audit_log
  - provider_credential_alerts
  - provider_notifications
  - provider_verification_history
  - session_recordings
  - staff_activity_logs

  ## Security Changes
  All always-true INSERT policies are dropped and recreated targeting service_role only,
  or the always-true policy is dropped in favour of existing more restrictive policies.
*/

-- appointment_status_history: system inserts only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointment_status_history'
      AND policyname = 'System can insert status history'
  ) THEN
    DROP POLICY "System can insert status history" ON public.appointment_status_history;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointment_status_history') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'appointment_status_history'
        AND policyname = 'Service role can insert status history'
    ) THEN
      CREATE POLICY "Service role can insert status history"
        ON public.appointment_status_history
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- audit_failures
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_failures'
      AND policyname IN ('System can insert audit failures', 'system_insert_audit_failures', 'activity_create')
  ) THEN
    DROP POLICY IF EXISTS "System can insert audit failures" ON public.audit_failures;
    DROP POLICY IF EXISTS "system_insert_audit_failures" ON public.audit_failures;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_failures') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'audit_failures'
        AND policyname = 'Service role can insert audit failures'
    ) THEN
      CREATE POLICY "Service role can insert audit failures"
        ON public.audit_failures
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- billing_transactions: authenticated users can create their own, system for others
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_transactions'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.billing_transactions', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_transactions') THEN
    CREATE POLICY "Patients can insert own billing transactions"
      ON public.billing_transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (patient_id = (SELECT auth.uid()));

    CREATE POLICY "Service role can insert billing transactions"
      ON public.billing_transactions
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- blockchain_audit_log: keep existing service_role policy, remove always-true authenticated one
DO $$
BEGIN
  DROP POLICY IF EXISTS "System can insert audit records" ON public.blockchain_audit_log;
  DROP POLICY IF EXISTS "system_create_audit" ON public.blockchain_audit_log;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blockchain_audit_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'blockchain_audit_log'
        AND policyname = 'Service role can insert audit records'
    ) THEN
      CREATE POLICY "Service role can insert audit records"
        ON public.blockchain_audit_log
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- custom_table_audit_log
DO $$
BEGIN
  DROP POLICY IF EXISTS "System can insert custom table audit" ON public.custom_table_audit_log;
  DROP POLICY IF EXISTS "system_insert_custom_audit" ON public.custom_table_audit_log;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_table_audit_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'custom_table_audit_log'
        AND policyname = 'Service role can insert custom table audit'
    ) THEN
      CREATE POLICY "Service role can insert custom table audit"
        ON public.custom_table_audit_log
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- delivery_quotes: providers/system create these
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_quotes'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_quotes', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_quotes') THEN
    CREATE POLICY "Service role can insert delivery quotes"
      ON public.delivery_quotes
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- email_verification_codes: system generates these
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_verification_codes'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.email_verification_codes', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_verification_codes') THEN
    CREATE POLICY "Service role can insert email verification codes"
      ON public.email_verification_codes
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- external_deliveries
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'external_deliveries'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.external_deliveries', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'external_deliveries') THEN
    CREATE POLICY "Service role can insert external deliveries"
      ON public.external_deliveries
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- fhir_sync_logs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fhir_sync_logs'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.fhir_sync_logs', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fhir_sync_logs') THEN
    CREATE POLICY "Service role can insert fhir sync logs"
      ON public.fhir_sync_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- marketplace_transaction_logs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_transaction_logs'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.marketplace_transaction_logs', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_transaction_logs') THEN
    CREATE POLICY "Service role can insert marketplace transaction logs"
      ON public.marketplace_transaction_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- notification_delivery_logs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_delivery_logs'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_delivery_logs', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_delivery_logs') THEN
    CREATE POLICY "Service role can insert notification delivery logs"
      ON public.notification_delivery_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- order_status_history
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_status_history'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_status_history', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_status_history') THEN
    CREATE POLICY "Service role can insert order status history"
      ON public.order_status_history
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- phone_verification_codes
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'phone_verification_codes'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.phone_verification_codes', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'phone_verification_codes') THEN
    CREATE POLICY "Service role can insert phone verification codes"
      ON public.phone_verification_codes
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- prescription_audit_log
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prescription_audit_log'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.prescription_audit_log', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prescription_audit_log') THEN
    CREATE POLICY "Service role can insert prescription audit log"
      ON public.prescription_audit_log
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- provider_credential_alerts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provider_credential_alerts'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.provider_credential_alerts', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_credential_alerts') THEN
    CREATE POLICY "Service role can insert provider credential alerts"
      ON public.provider_credential_alerts
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- provider_notifications: providers generate their own notifications via edge functions
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provider_notifications'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.provider_notifications', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_notifications') THEN
    CREATE POLICY "Service role can insert provider notifications"
      ON public.provider_notifications
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- provider_verification_history
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provider_verification_history'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.provider_verification_history', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_verification_history') THEN
    CREATE POLICY "Service role can insert provider verification history"
      ON public.provider_verification_history
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- session_recordings
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_recordings'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.session_recordings', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_recordings') THEN
    CREATE POLICY "Service role can insert session recordings"
      ON public.session_recordings
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- staff_activity_logs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_activity_logs'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_activity_logs', pol.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_activity_logs') THEN
    CREATE POLICY "Service role can insert staff activity logs"
      ON public.staff_activity_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;
