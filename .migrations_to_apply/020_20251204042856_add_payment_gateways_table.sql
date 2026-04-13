/*
  # Payment Gateways Configuration Table
*/

CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  gateway_name text NOT NULL CHECK (gateway_name IN ('stripe', 'square', 'paypal', 'authorize-net', 'moneris', 'bambora')),
  api_key_encrypted text,
  merchant_id text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  supported_methods jsonb DEFAULT '["card"]'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pharmacy_id, gateway_name)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_pharmacy_id ON payment_gateways(pharmacy_id);
