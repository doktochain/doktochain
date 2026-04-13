/*
  # Delivery Integration Tables

  ## New Tables
    - delivery_integrations - Third-party delivery API credentials
    - external_deliveries - External delivery tracking
    - delivery_quotes - Rate comparison
*/

CREATE TABLE IF NOT EXISTS delivery_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  provider_name text NOT NULL CHECK (provider_name IN ('uber-direct', 'doordash-drive', 'postmates', 'skip-the-dishes', 'custom')),
  api_key_encrypted text,
  merchant_id text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pharmacy_id, provider_name)
);

CREATE TABLE IF NOT EXISTS external_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES delivery_integrations(id),
  external_delivery_id text NOT NULL,
  provider_name text NOT NULL,
  tracking_url text,
  courier_name text,
  courier_phone text,
  estimated_pickup_time timestamptz,
  actual_pickup_time timestamptz,
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  delivery_status text,
  status_updates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  quote_amount_cents integer NOT NULL,
  estimated_pickup_minutes integer,
  estimated_delivery_minutes integer,
  quote_expires_at timestamptz,
  quote_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_integrations_pharmacy_id ON delivery_integrations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_external_deliveries_order_id ON external_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_quotes_order_id ON delivery_quotes(order_id);
