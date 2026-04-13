/*
  # Auth Compatibility Layer for Aurora PostgreSQL

  This script creates functions that replicate Supabase's auth.uid() and auth.jwt()
  behavior using PostgreSQL session variables. This allows all existing RLS policies
  to work without modification on Aurora.

  ## How It Works
  1. Lambda receives a Cognito JWT
  2. Lambda extracts user ID and claims
  3. Lambda sets session variables: app.current_user_id, app.current_role, app.jwt_claims
  4. RLS policies call auth.uid() which reads the session variable
  5. Session variables are scoped to the transaction (SET LOCAL)

  ## Functions Created
  - auth.uid() - Returns the current user's UUID
  - auth.jwt() - Returns the JWT claims as JSONB
  - auth.role() - Returns the current user's role
  - auth.email() - Returns the current user's email from JWT claims
*/

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.jwt_claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_role', true), ''),
    'anon'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text AS $$
  SELECT COALESCE(
    (auth.jwt()->>'email')::text,
    ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
