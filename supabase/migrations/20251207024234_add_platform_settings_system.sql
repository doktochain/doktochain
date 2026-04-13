/*
  # Platform Settings System

  1. New Tables
    - `platform_account_settings`
      - Manages account-level configurations
      - Authentication policies, security settings
    - `platform_website_settings`
      - Website-wide configurations
      - SEO, metadata, maintenance mode
    - `platform_clinic_settings`
      - Clinic operational settings
      - Business hours, policies, workflows
    - `platform_app_settings`
      - Mobile app configurations
      - Features, themes, notifications
    - `platform_system_settings`
      - Technical system configurations
      - Email, SMS, storage, APIs
    - `platform_finance_settings`
      - Financial configurations
      - Payment gateways, invoicing, fees
    - `platform_other_settings`
      - Miscellaneous settings
      - Integrations, custom fields
    - `settings_audit_log`
      - Tracks all settings changes

  2. Security
    - Enable RLS on all tables
    - Only admins can access settings
*/

-- Platform Account Settings
CREATE TABLE IF NOT EXISTS platform_account_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  key text NOT NULL UNIQUE,
  value jsonb,
  data_type text NOT NULL DEFAULT 'string',
  label text NOT NULL,
  description text,
  is_sensitive boolean DEFAULT false,
  is_editable boolean DEFAULT true,
  validation_rules jsonb,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Platform Website Settings
CREATE TABLE IF NOT EXISTS platform_website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text DEFAULT 'Doktochain',
  site_tagline text,
  site_description text,
  site_logo_url text,
  site_favicon_url text,
  maintenance_mode boolean DEFAULT false,
  maintenance_message text,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  google_analytics_id text,
  facebook_pixel_id text,
  custom_header_code text,
  custom_footer_code text,
  cookie_consent_enabled boolean DEFAULT true,
  cookie_consent_message text,
  social_facebook text,
  social_twitter text,
  social_instagram text,
  social_linkedin text,
  contact_email text,
  contact_phone text,
  contact_address text,
  default_language text DEFAULT 'en',
  available_languages text[] DEFAULT ARRAY['en', 'fr'],
  timezone text DEFAULT 'America/Toronto',
  date_format text DEFAULT 'YYYY-MM-DD',
  time_format text DEFAULT '24h',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform Clinic Settings
CREATE TABLE IF NOT EXISTS platform_clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_appointment_duration int DEFAULT 30,
  booking_window_days int DEFAULT 90,
  min_booking_notice_hours int DEFAULT 2,
  max_booking_notice_days int DEFAULT 90,
  allow_same_day_booking boolean DEFAULT true,
  allow_waitlist boolean DEFAULT true,
  auto_confirm_appointments boolean DEFAULT false,
  require_payment_upfront boolean DEFAULT false,
  cancellation_window_hours int DEFAULT 24,
  cancellation_fee_enabled boolean DEFAULT false,
  cancellation_fee_amount decimal(10,2),
  no_show_fee_enabled boolean DEFAULT false,
  no_show_fee_amount decimal(10,2),
  provider_approval_required boolean DEFAULT true,
  patient_id_verification_required boolean DEFAULT true,
  medical_record_retention_years int DEFAULT 7,
  prescription_refill_days_before int DEFAULT 7,
  telemedicine_enabled boolean DEFAULT true,
  default_business_hours jsonb DEFAULT '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}}',
  holidays jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform App Settings
CREATE TABLE IF NOT EXISTS platform_app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text DEFAULT 'Doktochain',
  app_version text,
  min_supported_version text,
  force_update_enabled boolean DEFAULT false,
  app_store_url text,
  play_store_url text,
  push_notifications_enabled boolean DEFAULT true,
  push_notification_provider text DEFAULT 'firebase',
  deep_linking_enabled boolean DEFAULT true,
  app_theme_primary_color text DEFAULT '#FF0000',
  app_theme_secondary_color text DEFAULT '#000000',
  feature_flags jsonb DEFAULT '{}',
  splash_screen_duration int DEFAULT 2000,
  onboarding_enabled boolean DEFAULT true,
  biometric_auth_enabled boolean DEFAULT true,
  offline_mode_enabled boolean DEFAULT false,
  analytics_enabled boolean DEFAULT true,
  crash_reporting_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform System Settings
CREATE TABLE IF NOT EXISTS platform_system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text,
  smtp_port int DEFAULT 587,
  smtp_username text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_encryption text DEFAULT 'tls',
  sms_provider text DEFAULT 'twilio',
  sms_api_key text,
  sms_api_secret text,
  sms_from_number text,
  storage_provider text DEFAULT 'supabase',
  storage_bucket_name text,
  storage_max_file_size_mb int DEFAULT 10,
  storage_allowed_file_types text[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  backup_enabled boolean DEFAULT true,
  backup_frequency text DEFAULT 'daily',
  backup_retention_days int DEFAULT 30,
  api_rate_limit_per_minute int DEFAULT 60,
  api_rate_limit_per_hour int DEFAULT 1000,
  session_timeout_minutes int DEFAULT 60,
  max_login_attempts int DEFAULT 5,
  login_lockout_minutes int DEFAULT 30,
  password_min_length int DEFAULT 8,
  password_require_uppercase boolean DEFAULT true,
  password_require_lowercase boolean DEFAULT true,
  password_require_numbers boolean DEFAULT true,
  password_require_special_chars boolean DEFAULT true,
  log_level text DEFAULT 'info',
  log_retention_days int DEFAULT 90,
  cache_enabled boolean DEFAULT true,
  cache_ttl_seconds int DEFAULT 3600,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform Finance Settings
CREATE TABLE IF NOT EXISTS platform_finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_currency text DEFAULT 'CAD',
  supported_currencies text[] DEFAULT ARRAY['CAD', 'USD'],
  tax_enabled boolean DEFAULT true,
  tax_name text DEFAULT 'HST',
  tax_rate decimal(5,2) DEFAULT 13.00,
  invoice_prefix text DEFAULT 'INV',
  invoice_number_format text DEFAULT 'INV-{YEAR}-{NUMBER}',
  invoice_starting_number int DEFAULT 1000,
  invoice_due_days int DEFAULT 30,
  invoice_logo_url text,
  invoice_footer_text text,
  payment_gateway_stripe_enabled boolean DEFAULT false,
  payment_gateway_stripe_public_key text,
  payment_gateway_stripe_secret_key text,
  payment_gateway_paypal_enabled boolean DEFAULT false,
  payment_gateway_paypal_client_id text,
  payment_gateway_paypal_secret text,
  platform_commission_rate decimal(5,2) DEFAULT 10.00,
  provider_payout_frequency text DEFAULT 'monthly',
  provider_minimum_payout_amount decimal(10,2) DEFAULT 100.00,
  refund_policy_enabled boolean DEFAULT true,
  refund_window_days int DEFAULT 30,
  automatic_refund_enabled boolean DEFAULT false,
  late_payment_fee_enabled boolean DEFAULT false,
  late_payment_fee_percentage decimal(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform Other Settings
CREATE TABLE IF NOT EXISTS platform_other_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  settings_data jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Settings Audit Log
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Initialize default settings
INSERT INTO platform_website_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

INSERT INTO platform_clinic_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

INSERT INTO platform_app_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

INSERT INTO platform_system_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

INSERT INTO platform_finance_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_settings_category ON platform_account_settings(category);
CREATE INDEX IF NOT EXISTS idx_account_settings_key ON platform_account_settings(key);
CREATE INDEX IF NOT EXISTS idx_other_settings_category ON platform_other_settings(category);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON settings_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON settings_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON settings_audit_log(changed_at);

-- Enable RLS
ALTER TABLE platform_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_other_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only)
CREATE POLICY "Admins can manage account settings"
  ON platform_account_settings FOR ALL
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

CREATE POLICY "Admins can manage website settings"
  ON platform_website_settings FOR ALL
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

CREATE POLICY "Admins can manage clinic settings"
  ON platform_clinic_settings FOR ALL
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

CREATE POLICY "Admins can manage app settings"
  ON platform_app_settings FOR ALL
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

CREATE POLICY "Admins can manage system settings"
  ON platform_system_settings FOR ALL
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

CREATE POLICY "Admins can manage finance settings"
  ON platform_finance_settings FOR ALL
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

CREATE POLICY "Admins can manage other settings"
  ON platform_other_settings FOR ALL
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

CREATE POLICY "Admins can view audit log"
  ON settings_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
