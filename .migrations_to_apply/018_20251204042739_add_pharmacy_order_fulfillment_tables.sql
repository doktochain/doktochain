/*
  # Order Fulfillment & Tracking Tables

  ## New Tables
    - order_fulfillment - Fulfillment workflow tracking
    - courier_assignments - Delivery personnel assignments
    - order_notes - Internal notes
    - order_status_history - Complete timeline
  
  ## Enhancements
    - Add insurance fields to pharmacy_orders
*/

CREATE TABLE IF NOT EXISTS order_fulfillment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id),
  assigned_to uuid REFERENCES pharmacy_staff(id),
  picking_started_at timestamptz,
  picking_completed_at timestamptz,
  verification_started_at timestamptz,
  verification_completed_at timestamptz,
  verification_by uuid REFERENCES pharmacy_staff(id),
  packing_started_at timestamptz,
  packing_completed_at timestamptz,
  quality_check_by uuid REFERENCES pharmacy_staff(id),
  quality_check_at timestamptz,
  ready_for_pickup_at timestamptz,
  fulfillment_status text DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'picking', 'verifying', 'packing', 'ready', 'dispatched', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  courier_type text NOT NULL CHECK (courier_type IN ('internal', 'third-party')),
  courier_staff_id uuid REFERENCES pharmacy_staff(id),
  courier_name text,
  courier_phone text,
  assigned_at timestamptz DEFAULT now(),
  dispatched_at timestamptz,
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  delivery_status text DEFAULT 'assigned' CHECK (delivery_status IN ('assigned', 'dispatched', 'in-transit', 'delivered', 'failed', 'returned')),
  delivery_proof_url text,
  delivery_signature_url text,
  delivery_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES pharmacy_staff(id),
  note_type text CHECK (note_type IN ('internal', 'customer-visible', 'delivery-instruction')),
  note_content text NOT NULL,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid REFERENCES pharmacy_staff(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add insurance columns to pharmacy_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_orders' AND column_name = 'insurance_claim_id'
  ) THEN
    ALTER TABLE pharmacy_orders ADD COLUMN insurance_claim_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_orders' AND column_name = 'insurance_adjudication_status'
  ) THEN
    ALTER TABLE pharmacy_orders ADD COLUMN insurance_adjudication_status text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_orders' AND column_name = 'copay_amount_cents'
  ) THEN
    ALTER TABLE pharmacy_orders ADD COLUMN copay_amount_cents integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacy_orders' AND column_name = 'insurance_paid_amount_cents'
  ) THEN
    ALTER TABLE pharmacy_orders ADD COLUMN insurance_paid_amount_cents integer DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_fulfillment_order_id ON order_fulfillment(order_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_pharmacy_id ON order_fulfillment(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_order_id ON courier_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
