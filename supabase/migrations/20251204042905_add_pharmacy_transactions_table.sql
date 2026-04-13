/*
  # Pharmacy Transactions Table
*/

CREATE TABLE IF NOT EXISTS pharmacy_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  order_id uuid REFERENCES pharmacy_orders(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'adjustment')),
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'cash', 'insurance', 'e-transfer', 'check')),
  gateway_id uuid REFERENCES payment_gateways(id),
  external_transaction_id text,
  amount_cents integer NOT NULL,
  fee_cents integer DEFAULT 0,
  net_amount_cents integer NOT NULL,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_details jsonb,
  reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  processed_by uuid REFERENCES pharmacy_staff(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_transactions_pharmacy_id ON pharmacy_transactions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_transactions_order_id ON pharmacy_transactions(order_id);
