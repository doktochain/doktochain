/*
  # Enterprise Dashboard Analytics Schema

  ## Overview
  Creates comprehensive analytics tables for enterprise admin dashboard including:
  - Dashboard analytics for KPIs and metrics
  - Financial transactions tracking
  - Sales metrics and performance data
  - System health monitoring

  ## New Tables

  ### `dashboard_analytics`
  Tracks daily/periodic analytics data
  - `id` (uuid, primary key)
  - `date` (date) - Analytics period date
  - `total_revenue` (decimal) - Total revenue for period
  - `total_appointments` (integer) - Number of appointments
  - `total_users` (integer) - Total registered users
  - `active_users` (integer) - Active users in period
  - `total_providers` (integer) - Total providers
  - `conversion_rate` (decimal) - Conversion percentage
  - `avg_session_duration` (integer) - Average session duration in seconds
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `financial_transactions`
  Records all financial transactions in the system
  - `id` (uuid, primary key)
  - `transaction_type` (text) - Type: payment, refund, withdrawal, etc.
  - `amount` (decimal) - Transaction amount
  - `currency` (text) - Currency code (default CAD)
  - `status` (text) - pending, completed, failed, cancelled
  - `description` (text) - Transaction description
  - `user_id` (uuid) - Reference to user
  - `provider_id` (uuid) - Reference to provider if applicable
  - `pharmacy_id` (uuid) - Reference to pharmacy if applicable
  - `appointment_id` (uuid) - Reference to appointment if applicable
  - `payment_method` (text) - Payment method used
  - `metadata` (jsonb) - Additional transaction data
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `sales_metrics`
  Stores sales performance metrics
  - `id` (uuid, primary key)
  - `period_start` (date) - Start of period
  - `period_end` (date) - End of period
  - `period_type` (text) - daily, weekly, monthly, quarterly, yearly
  - `total_sales` (decimal) - Total sales amount
  - `total_transactions` (integer) - Number of transactions
  - `conversion_rate` (decimal) - Sales conversion rate
  - `average_order_value` (decimal) - AOV
  - `customer_acquisition_cost` (decimal) - CAC
  - `customer_lifetime_value` (decimal) - CLV
  - `new_customers` (integer) - New customers in period
  - `returning_customers` (integer) - Returning customers
  - `revenue_by_category` (jsonb) - Revenue breakdown by category
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `system_metrics`
  System health and performance monitoring
  - `id` (uuid, primary key)
  - `metric_type` (text) - cpu, memory, api_latency, error_rate, etc.
  - `value` (decimal) - Metric value
  - `unit` (text) - Unit of measurement
  - `status` (text) - healthy, warning, critical
  - `metadata` (jsonb) - Additional metric data
  - `timestamp` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only admin users can access these tables
*/

-- Dashboard Analytics Table
CREATE TABLE IF NOT EXISTS dashboard_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_revenue decimal(12, 2) DEFAULT 0,
  total_appointments integer DEFAULT 0,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  total_providers integer DEFAULT 0,
  conversion_rate decimal(5, 2) DEFAULT 0,
  avg_session_duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Financial Transactions Table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'withdrawal', 'transfer', 'fee', 'bonus')),
  amount decimal(12, 2) NOT NULL,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description text,
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid,
  pharmacy_id uuid,
  appointment_id uuid,
  payment_method text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales Metrics Table
CREATE TABLE IF NOT EXISTS sales_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  total_sales decimal(12, 2) DEFAULT 0,
  total_transactions integer DEFAULT 0,
  conversion_rate decimal(5, 2) DEFAULT 0,
  average_order_value decimal(12, 2) DEFAULT 0,
  customer_acquisition_cost decimal(12, 2) DEFAULT 0,
  customer_lifetime_value decimal(12, 2) DEFAULT 0,
  new_customers integer DEFAULT 0,
  returning_customers integer DEFAULT 0,
  revenue_by_category jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(period_start, period_end, period_type)
);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  value decimal(12, 2) NOT NULL,
  unit text,
  status text DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical')),
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dashboard_analytics_date ON dashboard_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at ON financial_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id ON financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_period ON sales_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);

-- Enable Row Level Security
ALTER TABLE dashboard_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can access

-- Dashboard Analytics Policies
CREATE POLICY "Admins can view dashboard analytics"
  ON dashboard_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert dashboard analytics"
  ON dashboard_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update dashboard analytics"
  ON dashboard_analytics FOR UPDATE
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

-- Financial Transactions Policies
CREATE POLICY "Admins can view all financial transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert financial transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update financial transactions"
  ON financial_transactions FOR UPDATE
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

-- Sales Metrics Policies
CREATE POLICY "Admins can view sales metrics"
  ON sales_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert sales metrics"
  ON sales_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sales metrics"
  ON sales_metrics FOR UPDATE
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

-- System Metrics Policies
CREATE POLICY "Admins can view system metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert system metrics"
  ON system_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_dashboard_analytics_updated_at ON dashboard_analytics;
CREATE TRIGGER update_dashboard_analytics_updated_at
  BEFORE UPDATE ON dashboard_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_metrics_updated_at ON sales_metrics;
CREATE TRIGGER update_sales_metrics_updated_at
  BEFORE UPDATE ON sales_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();