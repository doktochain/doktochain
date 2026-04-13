/*
  # Fix RLS Policy Gaps - Phase 14.3 Verification

  1. Providers Table
    - Add policy for providers to view their own record (including non-verified)
    - Add policy for providers to update their own record
    - Add policy for providers to insert their own record (during onboarding)

  2. Pharmacies Table
    - Add policy for pharmacy owners to view their own pharmacy (including non-verified)
    - Add policy for pharmacy owners to update their own pharmacy
    - Add policy for pharmacy owners to insert their own pharmacy (during onboarding)

  3. Prescriptions Table - Cleanup
    - Remove 3 broken legacy policies that compare provider_id/patient_id directly
      to auth.uid() when the columns actually reference providers.id/patients.id
    - The correct policies using EXISTS subqueries already exist alongside them

  4. Important Notes
    - No data is modified, only access policies
    - All new policies restrict to authenticated users
    - Ownership verified via user_id = auth.uid() on the respective tables
*/

-- 1. Providers: allow providers to see their own record (even if not yet active/verified)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'providers' AND policyname = 'Providers can view own record'
  ) THEN
    CREATE POLICY "Providers can view own record"
      ON providers FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Providers: allow providers to update their own record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'providers' AND policyname = 'Providers can update own record'
  ) THEN
    CREATE POLICY "Providers can update own record"
      ON providers FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Providers: allow provider to insert own record during onboarding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'providers' AND policyname = 'Providers can insert own record'
  ) THEN
    CREATE POLICY "Providers can insert own record"
      ON providers FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 2. Pharmacies: allow pharmacy owners to view their own pharmacy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pharmacies' AND policyname = 'Pharmacy owners can view own pharmacy'
  ) THEN
    CREATE POLICY "Pharmacy owners can view own pharmacy"
      ON pharmacies FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Pharmacies: allow pharmacy owners to update their own pharmacy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pharmacies' AND policyname = 'Pharmacy owners can update own pharmacy'
  ) THEN
    CREATE POLICY "Pharmacy owners can update own pharmacy"
      ON pharmacies FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Pharmacies: allow pharmacy owner to insert own record during onboarding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pharmacies' AND policyname = 'Pharmacy owners can insert own pharmacy'
  ) THEN
    CREATE POLICY "Pharmacy owners can insert own pharmacy"
      ON pharmacies FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. Remove broken legacy prescription policies
-- These compare provider_id/patient_id directly to auth.uid(), but those columns
-- reference providers.id/patients.id (NOT auth.uid()), so they never match.
-- The correct policies using EXISTS subqueries already exist.

DROP POLICY IF EXISTS "Create prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "View own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Update own prescriptions" ON prescriptions;
