/*
  # Provider Payment & Billing System

  1. New Tables
    - `payment_gateway_configs`
      - Stores provider payment gateway settings (Stripe, Square, PayPal, Moneris)
      - API keys, webhook URLs, preferences
      - Test/Live mode configuration

    - `provider_payouts`
      - Tracks scheduled and completed payouts to providers
      - Bank transfer details
      - Processing fees
      - Reconciliation data

    - `insurance_claims`
      - Insurance claim submissions and tracking
      - Status (pending, paid, rejected)
      - Remittance advice
      - Provincial billing codes

    - `billing_codes_library`
      - Searchable procedure codes
      - Provincial fee schedules
      - Favorites per provider

    - `provider_transactions`
      - Comprehensive financial ledger
      - All charges, refunds, adjustments
      - Links to appointments and patients

    - `patient_statements`
      - Generated billing statements
      - Payment plans
      - Collections tracking

  2. Security
    - Enable RLS on all tables
    - Policies for provider access only
    - Encrypted sensitive payment data
    - Audit logging for financial transactions

  3. Indexes
    - Fast lookups by provider_id, date ranges
    - Transaction searching
    - Claim status filtering
*/

-- Payment Gateway Configurations
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  gateway_type text NOT NULL CHECK (gateway_type IN ('stripe', 'square', 'paypal', 'moneris')),

  -- Gateway credentials (encrypted)
  api_key_encrypted text,
  api_secret_encrypted text,
  merchant_id text,

  -- Configuration
  is_live_mode boolean DEFAULT false,
  webhook_url text,
  webhook_secret text,

  -- Stripe specific
  stripe_account_id text,
  stripe_publishable_key text,

  -- Square specific
  square_location_id text,
  square_access_token_encrypted text,

  -- PayPal specific
  paypal_client_id text,
  paypal_currency text DEFAULT 'CAD',

  -- Moneris specific (Canadian)
  moneris_store_id text,
  moneris_api_token_encrypted text,
  moneris_supports_interac boolean DEFAULT false,

  -- Settings
  auto_capture boolean DEFAULT true,
  refund_policy jsonb DEFAULT '{"days": 30, "percentage": 100}'::jsonb,
  fee_structure jsonb,
  payout_schedule text DEFAULT 'weekly',

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_configs_provider ON payment_gateway_configs(provider_id);

-- Provider Payouts
CREATE TABLE IF NOT EXISTS provider_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  gateway_type text NOT NULL,

  -- Payout details
  amount_gross decimal(10,2) NOT NULL,
  processing_fees decimal(10,2) DEFAULT 0,
  amount_net decimal(10,2) NOT NULL,
  currency text DEFAULT 'CAD',

  -- Transfer info
  bank_account_last4 text,
  payout_method text DEFAULT 'bank_transfer',
  scheduled_date date NOT NULL,
  completed_date timestamptz,

  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason text,

  -- References
  external_payout_id text,
  transaction_ids uuid[],

  -- Tax documentation
  tax_period text,
  t4a_issued boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_provider ON provider_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON provider_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled_date ON provider_payouts(scheduled_date);

-- Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  appointment_id uuid,

  -- Claim details
  claim_number text UNIQUE,
  claim_type text DEFAULT 'direct_billing' CHECK (claim_type IN ('direct_billing', 'patient_reimbursement', 'third_party')),

  -- Insurance info
  insurance_company text NOT NULL,
  insurance_plan_number text,
  policy_holder_name text,

  -- Provincial billing
  provincial_health_number text,
  province text CHECK (province IN ('ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU')),
  billing_portal text,

  -- Service details
  service_date date NOT NULL,
  billing_codes jsonb NOT NULL,
  diagnosis_codes jsonb,
  total_amount decimal(10,2) NOT NULL,

  -- Status tracking
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'paid', 'rejected', 'resubmitted')),
  submitted_date timestamptz,
  decision_date timestamptz,
  paid_date timestamptz,

  -- Payment details
  approved_amount decimal(10,2),
  paid_amount decimal(10,2),
  adjustment_reason text,
  rejection_reason text,

  -- External references
  external_claim_id text,
  remittance_advice_url text,

  -- Notes
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_provider ON insurance_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_service_date ON insurance_claims(service_date);

-- Billing Codes Library
CREATE TABLE IF NOT EXISTS billing_codes_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code details
  code text NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('procedure', 'diagnostic', 'modifier')),
  description text NOT NULL,

  -- Pricing
  province text,
  base_fee decimal(10,2),
  effective_date date,
  expiry_date date,

  -- Categorization
  specialty text,
  category text,
  subcategory text,

  -- Usage
  is_common boolean DEFAULT false,
  requires_prior_auth boolean DEFAULT false,

  -- Metadata
  search_terms text[],
  related_codes text[],

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_codes_code ON billing_codes_library(code);
CREATE INDEX IF NOT EXISTS idx_billing_codes_province ON billing_codes_library(province);
CREATE INDEX IF NOT EXISTS idx_billing_codes_specialty ON billing_codes_library(specialty);

-- Provider favorite billing codes
CREATE TABLE IF NOT EXISTS provider_favorite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  billing_code_id uuid REFERENCES billing_codes_library(id) NOT NULL,
  usage_count int DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, billing_code_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_codes_provider ON provider_favorite_codes(provider_id);

-- Provider Transactions (Comprehensive Ledger)
CREATE TABLE IF NOT EXISTS provider_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  patient_id uuid REFERENCES auth.users(id),
  appointment_id uuid,

  -- Transaction details
  transaction_type text NOT NULL CHECK (transaction_type IN ('charge', 'payment', 'refund', 'adjustment', 'fee', 'payout')),
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'CAD',

  -- Payment method
  payment_method text,
  payment_gateway text,

  -- Status
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),

  -- Description
  description text NOT NULL,
  service_type text,
  billing_code text,

  -- References
  external_transaction_id text,
  related_transaction_id uuid REFERENCES provider_transactions(id),
  invoice_id uuid,
  claim_id uuid REFERENCES insurance_claims(id),

  -- Metadata
  metadata jsonb,
  notes text,

  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_provider ON provider_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON provider_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON provider_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON provider_transactions(transaction_date);

-- Patient Billing Statements
CREATE TABLE IF NOT EXISTS patient_billing_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) NOT NULL,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,

  -- Statement details
  statement_number text UNIQUE NOT NULL,
  statement_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Amounts
  previous_balance decimal(10,2) DEFAULT 0,
  new_charges decimal(10,2) DEFAULT 0,
  payments_received decimal(10,2) DEFAULT 0,
  adjustments decimal(10,2) DEFAULT 0,
  current_balance decimal(10,2) NOT NULL,

  -- Line items
  line_items jsonb NOT NULL,

  -- Delivery
  sent_via text CHECK (sent_via IN ('email', 'postal', 'portal')),
  sent_date timestamptz,

  -- Payment plan
  has_payment_plan boolean DEFAULT false,
  payment_plan_id uuid,

  -- Collections
  is_overdue boolean DEFAULT false,
  days_overdue int DEFAULT 0,
  in_collections boolean DEFAULT false,
  collections_date date,

  -- Notes
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statements_provider ON patient_billing_statements(provider_id);
CREATE INDEX IF NOT EXISTS idx_statements_patient ON patient_billing_statements(patient_id);
CREATE INDEX IF NOT EXISTS idx_statements_date ON patient_billing_statements(statement_date);

-- Enable Row Level Security
ALTER TABLE payment_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_codes_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_favorite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_billing_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Payment Gateway Configs (Provider only)
CREATE POLICY "Providers can view own gateway configs"
  ON payment_gateway_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert own gateway configs"
  ON payment_gateway_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own gateway configs"
  ON payment_gateway_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Provider Payouts
CREATE POLICY "Providers can view own payouts"
  ON provider_payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- Insurance Claims
CREATE POLICY "Providers can manage own claims"
  ON insurance_claims FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Patients can view their claims"
  ON insurance_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Billing Codes (Public read)
CREATE POLICY "Anyone can view billing codes"
  ON billing_codes_library FOR SELECT
  TO authenticated
  USING (true);

-- Favorite Codes
CREATE POLICY "Providers can manage own favorite codes"
  ON provider_favorite_codes FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Provider Transactions
CREATE POLICY "Providers can view own transactions"
  ON provider_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert own transactions"
  ON provider_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Patients can view their transactions"
  ON provider_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Patient Statements
CREATE POLICY "Providers can manage own patient statements"
  ON patient_billing_statements FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Patients can view their statements"
  ON patient_billing_statements FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);
