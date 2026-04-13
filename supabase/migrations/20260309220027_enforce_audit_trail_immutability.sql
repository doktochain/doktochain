/*
  # Enforce Audit Trail Immutability

  1. Security Changes
    - Add BEFORE UPDATE/DELETE trigger on `blockchain_audit_log` to prevent any modification
    - Add explicit RLS policy denying UPDATE for all authenticated users
    - Enable FORCE ROW LEVEL SECURITY so table owner also respects RLS

  2. New Tables
    - `audit_failures` - captures audit entries that failed to write, with error details
      - `id` (uuid, primary key)
      - `attempted_event_type` (text) - the event type that failed
      - `attempted_resource_type` (text) - the resource type
      - `attempted_resource_id` (text) - the resource ID
      - `attempted_actor_id` (uuid) - who tried to log
      - `error_message` (text) - what went wrong
      - `attempted_data` (jsonb) - the data that was attempted to be logged
      - `created_at` (timestamptz) - when the failure occurred

  3. Important Notes
    - The immutability trigger raises an exception on any UPDATE or DELETE attempt
    - This applies to ALL users including service role and superuser
    - Audit failures table allows monitoring of logging issues
*/

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail records are immutable and cannot be modified or deleted. Block: %',
    CASE WHEN TG_OP = 'DELETE' THEN OLD.block_number ELSE NEW.block_number END;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_audit_immutability'
    AND tgrelid = 'blockchain_audit_log'::regclass
  ) THEN
    CREATE TRIGGER enforce_audit_immutability
      BEFORE UPDATE OR DELETE ON blockchain_audit_log
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_log_modification();
  END IF;
END $$;

ALTER TABLE blockchain_audit_log FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blockchain_audit_log' AND policyname = 'No one can update audit records'
  ) THEN
    CREATE POLICY "No one can update audit records"
      ON blockchain_audit_log
      FOR UPDATE
      TO authenticated
      USING (false);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_event_type text NOT NULL,
  attempted_resource_type text NOT NULL,
  attempted_resource_id text NOT NULL DEFAULT '',
  attempted_actor_id uuid,
  error_message text NOT NULL,
  attempted_data jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE audit_failures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_failures' AND policyname = 'Admins can view audit failures'
  ) THEN
    CREATE POLICY "Admins can view audit failures"
      ON audit_failures
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_failures' AND policyname = 'Authenticated users can insert audit failures'
  ) THEN
    CREATE POLICY "Authenticated users can insert audit failures"
      ON audit_failures
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
