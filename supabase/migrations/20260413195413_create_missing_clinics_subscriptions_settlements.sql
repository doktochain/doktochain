/*
  # Create Missing Tables: clinics, subscription_plans, subscriptions, provider_settlements

  These four tables were created directly in Supabase but never captured in a
  migration file. The Aurora migration pipeline (which iterates over
  supabase/migrations/) therefore never creates them, blocking:
    - Admin clinic management pages (clinics)
    - Pricing page (subscription_plans + subscriptions)
    - Provider billing settlements (provider_settlements)

  ## New Tables

  ### 1. `clinics`
    - Core clinic entity with owner, address, operating hours, and billing config
    - Supports soft delete via deleted_at column

  ### 2. `subscription_plans`
    - SaaS plan definitions for providers, clinics, and pharmacies
    - Seeded with 8 default plans across free/starter/pro/enterprise tiers

  ### 3. `subscriptions`
    - Active subscriptions linking users to plans
    - Tracks Stripe integration, billing intervals, and seat counts

  ### 4. `provider_settlements`
    - Manual settlement records for admin-to-provider payouts
    - Tracks gross amount, commission, net paid, payment method, and period

  ## Security
    - RLS enabled on all four tables
    - clinics: owners manage own; admins full access; public view active/verified
    - subscription_plans: authenticated read active; admin write
    - subscriptions: subscribers view/update own; admin full access
    - provider_settlements: providers view own (via join); admin full access
*/

-- =============================================
-- 1. CLINICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  slug text UNIQUE,
  description text DEFAULT '',
  logo_url text,
  phone text DEFAULT '',
  email text DEFAULT '',
  website text,
  address_line1 text DEFAULT '',
  address_line2 text,
  city text DEFAULT '',
  province text DEFAULT '',
  postal_code text DEFAULT '',
  latitude numeric,
  longitude numeric,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  specialties text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verification_date timestamptz,
  onboarding_status text DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed')),
  subscription_plan text DEFAULT 'free',
  max_providers integer DEFAULT 5,
  billing_model text DEFAULT 'percentage' CHECK (billing_model IN ('fixed', 'percentage', 'hybrid')),
  platform_fee_percentage decimal(5,2) DEFAULT 5.00,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinics_owner ON clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active) WHERE deleted_at IS NULL;

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Clinic owners can view own clinic') THEN
    CREATE POLICY "Clinic owners can view own clinic" ON clinics FOR SELECT TO authenticated USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Clinic owners can update own clinic') THEN
    CREATE POLICY "Clinic owners can update own clinic" ON clinics FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Clinic owners can insert own clinic') THEN
    CREATE POLICY "Clinic owners can insert own clinic" ON clinics FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Admins can view all clinics') THEN
    CREATE POLICY "Admins can view all clinics" ON clinics FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Admins can update clinics') THEN
    CREATE POLICY "Admins can update clinics" ON clinics FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true))
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Admins can insert clinics') THEN
    CREATE POLICY "Admins can insert clinics" ON clinics FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Admins can delete clinics') THEN
    CREATE POLICY "Admins can delete clinics" ON clinics FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinics' AND policyname = 'Authenticated users can view active clinics') THEN
    CREATE POLICY "Authenticated users can view active clinics" ON clinics FOR SELECT TO authenticated
      USING (is_active = true AND is_verified = true AND deleted_at IS NULL);
  END IF;
END $$;

-- =============================================
-- 2. SUBSCRIPTION_PLANS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text UNIQUE NOT NULL,
  name text NOT NULL,
  target_role text NOT NULL CHECK (target_role IN ('provider', 'clinic', 'pharmacy')),
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise', 'founding', 'custom')),
  monthly_price_cad decimal(10,2) DEFAULT 0,
  annual_price_cad decimal(10,2),
  seats_included integer,
  per_extra_seat_cad decimal(10,2),
  transaction_commission_pct decimal(5,2) DEFAULT 0,
  is_free boolean DEFAULT false,
  is_custom_pricing boolean DEFAULT false,
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '[]'::jsonb,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_key ON subscription_plans(plan_key);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_role ON subscription_plans(target_role);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Plans are publicly readable') THEN
    CREATE POLICY "Plans are publicly readable" ON subscription_plans FOR SELECT TO authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Admins can manage plans') THEN
    CREATE POLICY "Admins can manage plans" ON subscription_plans FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Admins can update plans') THEN
    CREATE POLICY "Admins can update plans" ON subscription_plans FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true))
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
END $$;

INSERT INTO subscription_plans (plan_key, name, target_role, tier, monthly_price_cad, annual_price_cad, transaction_commission_pct, is_free, is_popular, features, description, display_order)
VALUES
  ('solo_free', 'Solo Free', 'provider', 'free', 0, NULL, 5.00, true, false,
   '["Up to 10 appointments/month", "Basic patient management", "Standard video consultations", "Email support"]',
   'Get started with essential telemedicine tools at no cost.', 5),
  ('solo_starter', 'Solo Starter', 'provider', 'starter', 49.00, 470.00, 3.50, false, false,
   '["Up to 50 appointments/month", "Full patient management", "HD video consultations", "E-prescriptions", "Basic analytics", "Priority email support"]',
   'For providers building their practice with essential tools.', 10),
  ('solo_pro', 'Solo Pro', 'provider', 'pro', 99.00, 950.00, 2.50, false, true,
   '["Unlimited appointments", "Full patient management", "HD video consultations", "E-prescriptions", "Advanced analytics & reports", "Custom branding", "API access", "Priority phone & email support"]',
   'Full-featured plan for established solo practitioners.', 20),
  ('clinic_starter', 'Clinic Starter', 'clinic', 'starter', 199.00, 1910.00, 3.00, false, false,
   '["Up to 5 provider seats", "Clinic dashboard", "Shared scheduling", "Basic billing", "Email support"]',
   'For small clinics getting started with digital health.', 30),
  ('clinic_pro', 'Clinic Pro', 'clinic', 'pro', 399.00, 3830.00, 2.00, false, true,
   '["Up to 20 provider seats", "Advanced clinic dashboard", "Multi-location support", "Full billing & insurance", "Staff management", "Priority support"]',
   'Comprehensive solution for growing multi-provider clinics.', 40),
  ('clinic_enterprise', 'Clinic Enterprise', 'clinic', 'enterprise', 0, NULL, 1.50, false, false,
   '["Unlimited provider seats", "White-label option", "Dedicated account manager", "Custom integrations", "SLA guarantee", "24/7 phone support"]',
   'Tailored enterprise solution for large healthcare organizations.', 50),
  ('pharmacy_starter', 'Pharmacy Starter', 'pharmacy', 'starter', 79.00, 758.00, 3.00, false, false,
   '["E-prescription receiving", "Basic inventory management", "Order fulfillment", "Email support"]',
   'Essential digital tools for independent pharmacies.', 60),
  ('pharmacy_pro', 'Pharmacy Pro', 'pharmacy', 'pro', 149.00, 1430.00, 2.00, false, true,
   '["E-prescription receiving", "Advanced inventory management", "OTC marketplace", "Delivery integration", "Analytics", "Priority support"]',
   'Full-featured platform for pharmacies looking to grow.', 70)
ON CONFLICT (plan_key) DO NOTHING;

-- =============================================
-- 3. SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES auth.users(id) NOT NULL,
  subscriber_type text NOT NULL CHECK (subscriber_type IN ('provider', 'clinic', 'pharmacy')),
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  billing_interval text DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  seat_count integer DEFAULT 1,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT now() + interval '30 days',
  trial_end timestamptz,
  cancelled_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text,
  stripe_customer_id text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Subscribers can view own subscription') THEN
    CREATE POLICY "Subscribers can view own subscription" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = subscriber_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Subscribers can update own subscription') THEN
    CREATE POLICY "Subscribers can update own subscription" ON subscriptions FOR UPDATE TO authenticated USING (auth.uid() = subscriber_id) WITH CHECK (auth.uid() = subscriber_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Authenticated users can insert own subscription') THEN
    CREATE POLICY "Authenticated users can insert own subscription" ON subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = subscriber_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Admins can view all subscriptions') THEN
    CREATE POLICY "Admins can view all subscriptions" ON subscriptions FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Admins can update any subscription') THEN
    CREATE POLICY "Admins can update any subscription" ON subscriptions FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true))
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Admins can insert subscriptions') THEN
    CREATE POLICY "Admins can insert subscriptions" ON subscriptions FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
END $$;

-- =============================================
-- 4. PROVIDER_SETTLEMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS provider_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) NOT NULL,
  amount_cents integer NOT NULL,
  commission_cents integer DEFAULT 0,
  net_paid_cents integer NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('e-transfer', 'cheque', 'wire', 'other')),
  reference_number text NOT NULL,
  notes text,
  settled_by uuid REFERENCES auth.users(id),
  settled_at timestamptz DEFAULT now(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_settlements_provider ON provider_settlements(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_settlements_status ON provider_settlements(status);
CREATE INDEX IF NOT EXISTS idx_provider_settlements_settled_at ON provider_settlements(settled_at DESC);

ALTER TABLE provider_settlements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_settlements' AND policyname = 'Providers can view own settlements') THEN
    CREATE POLICY "Providers can view own settlements" ON provider_settlements FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM providers WHERE providers.id = provider_settlements.provider_id AND providers.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_settlements' AND policyname = 'Admins can manage all settlements') THEN
    CREATE POLICY "Admins can manage all settlements" ON provider_settlements FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true))
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true));
  END IF;
END $$;
