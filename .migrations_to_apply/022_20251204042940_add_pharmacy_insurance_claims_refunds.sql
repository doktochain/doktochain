/*
  # Pharmacy Insurance Claims and Refunds Tables
*/

CREATE TABLE IF NOT EXISTS pharmacy_insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  order_id uuid REFERENCES pharmacy_orders(id),
  prescription_id uuid REFERENCES prescriptions(id),
  claim_number text UNIQUE NOT NULL,
  insurance_provider text NOT NULL,
  insurance_plan text NOT NULL,
  policy_number text NOT NULL,
  group_number text,
  patient_id uuid REFERENCES patients(id),
  submitted_amount_cents integer NOT NULL,
  approved_amount_cents integer,
  copay_amount_cents integer,
  submission_date timestamptz DEFAULT now(),
  adjudication_date timestamptz,
  payment_date timestamptz,
  claim_status text DEFAULT 'submitted' CHECK (claim_status IN ('submitted', 'pending', 'approved', 'partially-approved', 'denied', 'resubmitted', 'paid')),
  denial_reason text,
  denial_code text,
  resubmission_notes text,
  submitted_by uuid REFERENCES pharmacy_staff(id),
  claim_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  order_id uuid REFERENCES pharmacy_orders(id),
  transaction_id uuid REFERENCES pharmacy_transactions(id),
  refund_amount_cents integer NOT NULL,
  refund_reason text NOT NULL CHECK (refund_reason IN ('customer-request', 'damaged-product', 'wrong-item', 'out-of-stock', 'quality-issue', 'other')),
  detailed_reason text,
  refund_method text NOT NULL CHECK (refund_method IN ('original-payment', 'cash', 'store-credit', 'check')),
  requested_by uuid REFERENCES pharmacy_staff(id),
  approved_by uuid REFERENCES pharmacy_staff(id),
  refund_status text DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'rejected', 'processed', 'cancelled')),
  approved_at timestamptz,
  processed_at timestamptz,
  rejection_reason text,
  gateway_refund_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_pharmacy_id ON pharmacy_insurance_claims(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_insurance_claims_status ON pharmacy_insurance_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_pharmacy_id ON pharmacy_refunds(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_order_id ON pharmacy_refunds(order_id);
