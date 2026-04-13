/*
  # Enterprise Finance & Accounts Management System

  ## Overview
  Comprehensive financial management system for platform administrators to oversee
  all financial operations including expenses, income, invoices, payments, refunds,
  and marketplace transactions across providers, pharmacies, and patients.

  ## New Tables

  ### 1. `platform_expenses`
  Tracks all platform operational costs and expenses
  - `id` (uuid, primary key)
  - `expense_category` (text) - server, marketing, staff_salaries, third_party_services, operational, other
  - `amount` (decimal) - Expense amount
  - `currency` (text) - Default CAD
  - `description` (text) - Detailed description
  - `expense_date` (date) - Date of expense
  - `vendor_name` (text) - Vendor/supplier name
  - `receipt_url` (text) - Link to receipt document
  - `status` (text) - pending, approved, rejected, paid
  - `department` (text) - Which department incurred this expense
  - `submitted_by` (uuid) - Staff member who submitted
  - `approved_by` (uuid) - Admin who approved
  - `approval_notes` (text) - Notes from approver
  - `is_recurring` (boolean) - Whether this is a recurring expense
  - `recurrence_interval` (text) - monthly, quarterly, yearly
  - `metadata` (jsonb) - Additional expense data
  - `created_at`, `updated_at` (timestamptz)

  ### 2. `platform_income`
  Tracks all revenue streams and income sources
  - `id` (uuid, primary key)
  - `income_source` (text) - provider_commission, pharmacy_commission, subscription_fees, premium_features, other
  - `amount` (decimal) - Income amount
  - `currency` (text) - Default CAD
  - `description` (text) - Income description
  - `income_date` (date) - Date of income
  - `related_user_id` (uuid) - Provider/pharmacy/patient who generated this income
  - `related_user_type` (text) - provider, pharmacy, patient
  - `related_transaction_id` (uuid) - Reference to original transaction
  - `metadata` (jsonb) - Additional income data
  - `created_at`, `updated_at` (timestamptz)

  ### 3. `platform_invoices`
  Platform-generated invoices for services
  - `id` (uuid, primary key)
  - `invoice_number` (text, unique) - Human-readable invoice number
  - `client_id` (uuid) - Client user ID
  - `client_type` (text) - provider, pharmacy, patient, other
  - `client_name` (text) - Client name
  - `client_email` (text) - Client email
  - `billing_address` (jsonb) - Client billing address
  - `invoice_date` (date) - Invoice date
  - `due_date` (date) - Payment due date
  - `subtotal` (decimal) - Subtotal before tax
  - `tax_rate` (decimal) - Tax percentage
  - `tax_amount` (decimal) - Calculated tax amount
  - `total_amount` (decimal) - Total amount due
  - `currency` (text) - Default CAD
  - `status` (text) - draft, sent, paid, overdue, cancelled
  - `payment_terms` (text) - Payment terms description
  - `notes` (text) - Additional notes
  - `paid_amount` (decimal) - Amount paid so far
  - `paid_date` (timestamptz) - When payment was received
  - `payment_method` (text) - How payment was made
  - `reminder_sent_at` (timestamptz) - Last reminder date
  - `metadata` (jsonb) - Additional invoice data
  - `created_at`, `updated_at` (timestamptz)

  ### 4. `platform_invoice_items`
  Line items for platform invoices
  - `id` (uuid, primary key)
  - `invoice_id` (uuid) - Reference to platform_invoices
  - `description` (text) - Item description
  - `quantity` (decimal) - Quantity
  - `unit_price` (decimal) - Price per unit
  - `total_price` (decimal) - Quantity × unit_price
  - `item_order` (integer) - Display order
  - `metadata` (jsonb) - Additional item data
  - `created_at` (timestamptz)

  ### 5. `platform_billing_configs`
  Global billing configuration for the platform
  - `id` (uuid, primary key)
  - `config_key` (text, unique) - Configuration key name
  - `user_type` (text) - provider, pharmacy, patient
  - `is_active` (boolean) - Whether billing is active for this user type
  - `billing_model` (text) - fixed, percentage
  - `fixed_amount` (decimal) - Fixed fee amount if billing_model is fixed
  - `percentage_rate` (decimal) - Percentage rate if billing_model is percentage
  - `minimum_charge` (decimal) - Minimum charge per transaction
  - `maximum_charge` (decimal) - Maximum charge per transaction
  - `billing_cycle` (text) - monthly, weekly, biweekly, custom
  - `payout_threshold` (decimal) - Minimum balance for payout
  - `description` (text) - Configuration description
  - `metadata` (jsonb) - Additional configuration data
  - `created_at`, `updated_at` (timestamptz)

  ### 6. `refund_requests`
  Centralized refund request management
  - `id` (uuid, primary key)
  - `refund_type` (text) - provider_refund, pharmacy_refund, patient_refund
  - `original_transaction_id` (uuid) - Reference to original transaction
  - `requester_id` (uuid) - User requesting refund
  - `requester_type` (text) - provider, pharmacy, patient, admin
  - `recipient_id` (uuid) - Who receives the refund
  - `recipient_type` (text) - provider, pharmacy, patient
  - `refund_amount` (decimal) - Amount to refund
  - `currency` (text) - Default CAD
  - `refund_reason` (text) - cancelled_service, quality_issue, billing_error, customer_request, other
  - `detailed_reason` (text) - Detailed explanation
  - `supporting_documents` (jsonb) - Array of document URLs
  - `status` (text) - pending, approved, rejected, processing, completed, failed
  - `reviewed_by` (uuid) - Admin who reviewed
  - `review_notes` (text) - Review decision notes
  - `reviewed_at` (timestamptz) - Review timestamp
  - `processed_at` (timestamptz) - Processing completion timestamp
  - `gateway_refund_id` (text) - Payment gateway refund reference
  - `failure_reason` (text) - Reason if refund failed
  - `metadata` (jsonb) - Additional refund data
  - `created_at`, `updated_at` (timestamptz)

  ### 7. `marketplace_transaction_logs`
  Comprehensive audit log of all marketplace financial activities
  - `id` (uuid, primary key)
  - `transaction_id` (uuid) - Reference to actual transaction
  - `transaction_type` (text) - provider_payment, pharmacy_payment, platform_fee, refund, payout, adjustment
  - `actor_id` (uuid) - Who initiated the transaction
  - `actor_type` (text) - provider, pharmacy, patient, admin, system
  - `target_id` (uuid) - Who is affected by transaction
  - `target_type` (text) - provider, pharmacy, patient
  - `amount` (decimal) - Transaction amount
  - `currency` (text) - Default CAD
  - `status` (text) - initiated, processing, completed, failed, cancelled
  - `payment_method` (text) - Payment method used
  - `gateway_name` (text) - Payment gateway used
  - `gateway_transaction_id` (text) - External reference ID
  - `description` (text) - Transaction description
  - `ip_address` (text) - IP address of requester
  - `user_agent` (text) - User agent string
  - `related_entity_type` (text) - appointment, prescription, order, subscription
  - `related_entity_id` (uuid) - Reference to related entity
  - `metadata` (jsonb) - Complete transaction data snapshot
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz)

  ### 8. `delivery_cost_analytics`
  Analytics for delivery costs across the platform
  - `id` (uuid, primary key)
  - `period_date` (date) - Analytics period date
  - `pharmacy_id` (uuid) - Pharmacy reference
  - `delivery_provider` (text) - uber-direct, doordash-drive, skip-the-dishes, etc.
  - `region` (text) - Geographic region
  - `total_deliveries` (integer) - Number of deliveries
  - `total_cost` (decimal) - Total delivery costs
  - `average_cost` (decimal) - Average cost per delivery
  - `average_distance_km` (decimal) - Average delivery distance
  - `average_duration_minutes` (integer) - Average delivery time
  - `cost_per_km` (decimal) - Cost efficiency metric
  - `revenue_from_deliveries` (decimal) - Delivery fees collected from customers
  - `profit_margin` (decimal) - Profit/loss on deliveries
  - `metadata` (jsonb) - Additional analytics data
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only admin users with proper permissions can access financial data
  - Comprehensive audit logging for all financial operations
  - Encryption for sensitive financial information

  ## Indexes
  - Optimize queries for date range filtering
  - Fast lookups by user, status, type
  - Transaction searching and reporting
*/

-- Platform Expenses Table
CREATE TABLE IF NOT EXISTS platform_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_category text NOT NULL CHECK (expense_category IN ('server', 'marketing', 'staff_salaries', 'third_party_services', 'operational', 'other')),
  amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'CAD',
  description text NOT NULL,
  expense_date date NOT NULL,
  vendor_name text,
  receipt_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  department text,
  submitted_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approval_notes text,
  is_recurring boolean DEFAULT false,
  recurrence_interval text CHECK (recurrence_interval IN ('monthly', 'quarterly', 'yearly', NULL)),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_expenses_date ON platform_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_expenses_category ON platform_expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_platform_expenses_status ON platform_expenses(status);
CREATE INDEX IF NOT EXISTS idx_platform_expenses_submitted_by ON platform_expenses(submitted_by);

-- Platform Income Table
CREATE TABLE IF NOT EXISTS platform_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_source text NOT NULL CHECK (income_source IN ('provider_commission', 'pharmacy_commission', 'subscription_fees', 'premium_features', 'other')),
  amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'CAD',
  description text,
  income_date date NOT NULL,
  related_user_id uuid REFERENCES auth.users(id),
  related_user_type text CHECK (related_user_type IN ('provider', 'pharmacy', 'patient', NULL)),
  related_transaction_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_income_date ON platform_income(income_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_income_source ON platform_income(income_source);
CREATE INDEX IF NOT EXISTS idx_platform_income_user ON platform_income(related_user_id);

-- Platform Invoices Table
CREATE TABLE IF NOT EXISTS platform_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES auth.users(id),
  client_type text CHECK (client_type IN ('provider', 'pharmacy', 'patient', 'other')),
  client_name text NOT NULL,
  client_email text NOT NULL,
  billing_address jsonb,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  subtotal decimal(12, 2) NOT NULL,
  tax_rate decimal(5, 2) DEFAULT 0,
  tax_amount decimal(12, 2) DEFAULT 0,
  total_amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_terms text,
  notes text,
  paid_amount decimal(12, 2) DEFAULT 0,
  paid_date timestamptz,
  payment_method text,
  reminder_sent_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_number ON platform_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_client ON platform_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status ON platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_date ON platform_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_due_date ON platform_invoices(due_date);

-- Platform Invoice Items Table
CREATE TABLE IF NOT EXISTS platform_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES platform_invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10, 2) NOT NULL DEFAULT 1,
  unit_price decimal(12, 2) NOT NULL,
  total_price decimal(12, 2) NOT NULL,
  item_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_invoice_items_invoice ON platform_invoice_items(invoice_id);

-- Platform Billing Configurations Table
CREATE TABLE IF NOT EXISTS platform_billing_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('provider', 'pharmacy', 'patient')),
  is_active boolean DEFAULT false,
  billing_model text NOT NULL CHECK (billing_model IN ('fixed', 'percentage')),
  fixed_amount decimal(12, 2),
  percentage_rate decimal(5, 2),
  minimum_charge decimal(12, 2),
  maximum_charge decimal(12, 2),
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'weekly', 'biweekly', 'custom')),
  payout_threshold decimal(12, 2) DEFAULT 100,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_billing_configs_user_type ON platform_billing_configs(user_type);
CREATE INDEX IF NOT EXISTS idx_platform_billing_configs_active ON platform_billing_configs(is_active);

-- Refund Requests Table
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_type text NOT NULL CHECK (refund_type IN ('provider_refund', 'pharmacy_refund', 'patient_refund')),
  original_transaction_id uuid,
  requester_id uuid REFERENCES auth.users(id) NOT NULL,
  requester_type text NOT NULL CHECK (requester_type IN ('provider', 'pharmacy', 'patient', 'admin')),
  recipient_id uuid REFERENCES auth.users(id),
  recipient_type text CHECK (recipient_type IN ('provider', 'pharmacy', 'patient')),
  refund_amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'CAD',
  refund_reason text NOT NULL CHECK (refund_reason IN ('cancelled_service', 'quality_issue', 'billing_error', 'customer_request', 'other')),
  detailed_reason text,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  reviewed_at timestamptz,
  processed_at timestamptz,
  gateway_refund_id text,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_requester ON refund_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_type ON refund_requests(refund_type);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created ON refund_requests(created_at DESC);

-- Marketplace Transaction Logs Table
CREATE TABLE IF NOT EXISTS marketplace_transaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid,
  transaction_type text NOT NULL CHECK (transaction_type IN ('provider_payment', 'pharmacy_payment', 'platform_fee', 'refund', 'payout', 'adjustment')),
  actor_id uuid REFERENCES auth.users(id),
  actor_type text CHECK (actor_type IN ('provider', 'pharmacy', 'patient', 'admin', 'system')),
  target_id uuid REFERENCES auth.users(id),
  target_type text CHECK (target_type IN ('provider', 'pharmacy', 'patient')),
  amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'CAD',
  status text NOT NULL CHECK (status IN ('initiated', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method text,
  gateway_name text,
  gateway_transaction_id text,
  description text,
  ip_address text,
  user_agent text,
  related_entity_type text CHECK (related_entity_type IN ('appointment', 'prescription', 'order', 'subscription', NULL)),
  related_entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_logs_transaction ON marketplace_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_logs_actor ON marketplace_transaction_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_logs_target ON marketplace_transaction_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_logs_type ON marketplace_transaction_logs(transaction_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_logs_status ON marketplace_transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_logs_created ON marketplace_transaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_logs_gateway ON marketplace_transaction_logs(gateway_transaction_id);

-- Delivery Cost Analytics Table
CREATE TABLE IF NOT EXISTS delivery_cost_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date date NOT NULL,
  pharmacy_id uuid REFERENCES pharmacies(id),
  delivery_provider text,
  region text,
  total_deliveries integer DEFAULT 0,
  total_cost decimal(12, 2) DEFAULT 0,
  average_cost decimal(12, 2) DEFAULT 0,
  average_distance_km decimal(8, 2),
  average_duration_minutes integer,
  cost_per_km decimal(8, 2),
  revenue_from_deliveries decimal(12, 2) DEFAULT 0,
  profit_margin decimal(12, 2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(period_date, pharmacy_id, delivery_provider, region)
);

CREATE INDEX IF NOT EXISTS idx_delivery_analytics_date ON delivery_cost_analytics(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_pharmacy ON delivery_cost_analytics(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_provider ON delivery_cost_analytics(delivery_provider);

-- Enable Row Level Security
ALTER TABLE platform_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_billing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_cost_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access for all financial tables
-- Platform Expenses Policies
CREATE POLICY "Admins can view all expenses"
  ON platform_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create expenses"
  ON platform_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update expenses"
  ON platform_expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete expenses"
  ON platform_expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Platform Income Policies
CREATE POLICY "Admins can view all income"
  ON platform_income FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create income"
  ON platform_income FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update income"
  ON platform_income FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Platform Invoices Policies
CREATE POLICY "Admins can view all invoices"
  ON platform_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invoices"
  ON platform_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invoices"
  ON platform_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invoices"
  ON platform_invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Platform Invoice Items Policies
CREATE POLICY "Admins can view all invoice items"
  ON platform_invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invoice items"
  ON platform_invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invoice items"
  ON platform_invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invoice items"
  ON platform_invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Platform Billing Configs Policies
CREATE POLICY "Admins can view billing configs"
  ON platform_billing_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create billing configs"
  ON platform_billing_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update billing configs"
  ON platform_billing_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Refund Requests Policies
CREATE POLICY "Admins can view all refund requests"
  ON refund_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create refund requests"
  ON refund_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update refund requests"
  ON refund_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Marketplace Transaction Logs Policies (read-only for audit)
CREATE POLICY "Admins can view transaction logs"
  ON marketplace_transaction_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create transaction logs"
  ON marketplace_transaction_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Delivery Cost Analytics Policies
CREATE POLICY "Admins can view delivery analytics"
  ON delivery_cost_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create delivery analytics"
  ON delivery_cost_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update delivery analytics"
  ON delivery_cost_analytics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Seed initial billing configurations
INSERT INTO platform_billing_configs (config_key, user_type, is_active, billing_model, percentage_rate, minimum_charge, description)
VALUES
  ('provider_commission', 'provider', false, 'percentage', 5.00, 2.00, 'Commission charged to providers for each completed appointment'),
  ('pharmacy_commission', 'pharmacy', false, 'percentage', 3.50, 1.50, 'Commission charged to pharmacies for each completed order')
ON CONFLICT (config_key) DO NOTHING;
