/*
  # Create RLS helper functions

  These SECURITY DEFINER functions prevent infinite recursion in RLS policies
  and provide a clean API for common access checks.

  1. New Functions
    - `is_admin()` - Returns true if current user has admin role
    - `get_patient_id()` - Returns patient record ID for current user
    - `get_provider_id()` - Returns provider record ID for current user
    - `get_pharmacy_id()` - Returns pharmacy record ID for current user
    - `has_active_consent(p_patient_id, p_provider_id)` - Checks time-windowed consent

  2. Security
    - All functions use SECURITY DEFINER to bypass RLS on lookup tables
    - search_path is pinned to 'public' to prevent search path injection
    - Functions are owned by the migration role (superuser)
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_patient_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM patients WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM providers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_pharmacy_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM pharmacies WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_active_consent(p_patient_id uuid, p_provider_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_consents
    WHERE patient_id = p_patient_id
      AND provider_id = p_provider_id
      AND status = 'active'
      AND start_date <= now()
      AND (end_date IS NULL OR end_date >= now())
  );
$$;
