/*
  # Blockchain Audit Layer

  1. New Tables
    - blockchain_audit_log - Immutable audit trail
    - blockchain_nodes - Node configuration
    - blockchain_integrity_checks - Integrity verification

  2. Security
    - RLS enabled
    - Immutable records (no updates/deletes)

  3. Features
    - SHA-256 hash chains
    - Tamper detection
    - Prescription lifecycle tracking
*/

-- Blockchain Audit Log
CREATE TABLE IF NOT EXISTS blockchain_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_number bigserial UNIQUE NOT NULL,
  previous_hash text,
  current_hash text NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_role text,
  action_data jsonb NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  location_data jsonb,
  verified boolean DEFAULT false,
  verification_timestamp timestamptz,
  tamper_detected boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Blockchain Nodes
CREATE TABLE IF NOT EXISTS blockchain_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_name text NOT NULL UNIQUE,
  node_type text DEFAULT 'audit',
  endpoint_url text,
  public_key text,
  status text DEFAULT 'active',
  last_sync_block bigint,
  last_sync_at timestamptz,
  sync_lag_seconds integer,
  configuration jsonb DEFAULT '{}',
  performance_metrics jsonb DEFAULT '{}',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Blockchain Integrity Checks
CREATE TABLE IF NOT EXISTS blockchain_integrity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  start_block bigint NOT NULL,
  end_block bigint NOT NULL,
  blocks_checked integer NOT NULL,
  status text DEFAULT 'in_progress',
  integrity_status text,
  issues_found integer DEFAULT 0,
  issue_details jsonb DEFAULT '[]',
  hash_mismatches integer DEFAULT 0,
  missing_blocks integer DEFAULT 0,
  execution_time_ms integer,
  checked_by uuid REFERENCES auth.users(id),
  node_id uuid REFERENCES blockchain_nodes(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE blockchain_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_integrity_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_view_audit" ON blockchain_audit_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "users_view_own_audit" ON blockchain_audit_log FOR SELECT TO authenticated
USING (actor_id = auth.uid());

CREATE POLICY "system_create_audit" ON blockchain_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_manage_nodes" ON blockchain_nodes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

CREATE POLICY "admin_manage_checks" ON blockchain_integrity_checks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

-- Seed initial node
INSERT INTO blockchain_nodes (node_name, node_type, status, is_primary) VALUES
  ('Primary Audit Node', 'audit', 'active', true)
ON CONFLICT (node_name) DO NOTHING;
