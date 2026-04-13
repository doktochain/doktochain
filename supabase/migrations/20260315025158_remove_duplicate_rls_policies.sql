/*
  # Remove Duplicate and Redundant RLS Policies

  ## Summary
  This migration removes truly duplicate and redundant RLS policies that were
  identified in the security audit. Having multiple policies with identical
  conditions for the same operation causes unnecessary policy evaluation overhead.

  ## Changes
  - `blockchain_audit_log`: Remove duplicate INSERT policy `system_create_audit`
    (kept: `System can insert audit records`)
  - `blockchain_audit_log`: Remove duplicate SELECT policy `users_view_own_audit`
    (kept: `Users can view own audit records`)
  - `allergies`: Remove redundant SELECT policy `Patients can view own allergies`
    since the ALL policy `Patients can manage own allergies` already covers SELECT
  - `provider_locations`: Remove duplicate SELECT policy
    `Provider locations are viewable by everyone`
    (kept: `Anyone can view provider locations`)
  - `provider_procedures`: Remove duplicate SELECT policy
    `Public can view provider procedures`
    (kept: `Anyone can view provider procedures`)
*/

-- blockchain_audit_log: remove duplicate INSERT
DROP POLICY IF EXISTS "system_create_audit" ON public.blockchain_audit_log;

-- blockchain_audit_log: remove duplicate SELECT
DROP POLICY IF EXISTS "users_view_own_audit" ON public.blockchain_audit_log;

-- allergies: remove redundant SELECT (ALL policy covers SELECT)
DROP POLICY IF EXISTS "Patients can view own allergies" ON public.allergies;

-- provider_locations: remove duplicate SELECT
DROP POLICY IF EXISTS "Provider locations are viewable by everyone" ON public.provider_locations;

-- provider_procedures: remove duplicate SELECT
DROP POLICY IF EXISTS "Public can view provider procedures" ON public.provider_procedures;
