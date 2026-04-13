import { supabase } from '../lib/supabase';

export interface WebsiteSettings {
  id: string;
  site_name: string;
  site_tagline?: string;
  site_description?: string;
  site_logo_url?: string;
  site_favicon_url?: string;
  maintenance_mode: boolean;
  maintenance_message?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  custom_header_code?: string;
  custom_footer_code?: string;
  cookie_consent_enabled: boolean;
  cookie_consent_message?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_instagram?: string;
  social_linkedin?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  default_language: string;
  available_languages: string[];
  timezone: string;
  date_format: string;
  time_format: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicSettings {
  id: string;
  default_appointment_duration: number;
  booking_window_days: number;
  min_booking_notice_hours: number;
  max_booking_notice_days: number;
  allow_same_day_booking: boolean;
  allow_waitlist: boolean;
  auto_confirm_appointments: boolean;
  require_payment_upfront: boolean;
  cancellation_window_hours: number;
  cancellation_fee_enabled: boolean;
  cancellation_fee_amount?: number;
  no_show_fee_enabled: boolean;
  no_show_fee_amount?: number;
  provider_approval_required: boolean;
  patient_id_verification_required: boolean;
  medical_record_retention_years: number;
  prescription_refill_days_before: number;
  telemedicine_enabled: boolean;
  default_business_hours: any;
  holidays: any[];
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  app_name: string;
  app_version?: string;
  min_supported_version?: string;
  force_update_enabled: boolean;
  app_store_url?: string;
  play_store_url?: string;
  push_notifications_enabled: boolean;
  push_notification_provider: string;
  deep_linking_enabled: boolean;
  app_theme_primary_color: string;
  app_theme_secondary_color: string;
  feature_flags: any;
  splash_screen_duration: number;
  onboarding_enabled: boolean;
  biometric_auth_enabled: boolean;
  offline_mode_enabled: boolean;
  analytics_enabled: boolean;
  crash_reporting_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  smtp_host?: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  smtp_encryption: string;
  sms_provider: string;
  sms_api_key?: string;
  sms_api_secret?: string;
  sms_from_number?: string;
  storage_provider: string;
  storage_bucket_name?: string;
  storage_max_file_size_mb: number;
  storage_allowed_file_types: string[];
  backup_enabled: boolean;
  backup_frequency: string;
  backup_retention_days: number;
  api_rate_limit_per_minute: number;
  api_rate_limit_per_hour: number;
  session_timeout_minutes: number;
  max_login_attempts: number;
  login_lockout_minutes: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special_chars: boolean;
  log_level: string;
  log_retention_days: number;
  cache_enabled: boolean;
  cache_ttl_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceSettings {
  id: string;
  default_currency: string;
  supported_currencies: string[];
  tax_enabled: boolean;
  tax_name: string;
  tax_rate: number;
  invoice_prefix: string;
  invoice_number_format: string;
  invoice_starting_number: number;
  invoice_due_days: number;
  invoice_logo_url?: string;
  invoice_footer_text?: string;
  payment_gateway_stripe_enabled: boolean;
  payment_gateway_stripe_public_key?: string;
  payment_gateway_stripe_secret_key?: string;
  payment_gateway_paypal_enabled: boolean;
  payment_gateway_paypal_client_id?: string;
  payment_gateway_paypal_secret?: string;
  platform_commission_rate: number;
  provider_payout_frequency: string;
  provider_minimum_payout_amount: number;
  refund_policy_enabled: boolean;
  refund_window_days: number;
  automatic_refund_enabled: boolean;
  late_payment_fee_enabled: boolean;
  late_payment_fee_percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface AccountSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  data_type: string;
  label: string;
  description?: string;
  is_sensitive: boolean;
  is_editable: boolean;
  validation_rules?: any;
  display_order: number;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export const platformSettingsService = {
  async getWebsiteSettings(): Promise<WebsiteSettings | null> {
    try {
      const { data, error } = await supabase
        .from('platform_website_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching website settings:', error);
      return null;
    }
  },

  async updateWebsiteSettings(settings: Partial<WebsiteSettings>): Promise<WebsiteSettings | null> {
    try {
      const current = await this.getWebsiteSettings();
      if (!current) throw new Error('Settings not found');

      const { data, error } = await supabase
        .from('platform_website_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating website settings:', error);
      return null;
    }
  },

  async getClinicSettings(): Promise<ClinicSettings | null> {
    try {
      const { data, error } = await supabase
        .from('platform_clinic_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching clinic settings:', error);
      return null;
    }
  },

  async updateClinicSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings | null> {
    try {
      const current = await this.getClinicSettings();
      if (!current) throw new Error('Settings not found');

      const { data, error } = await supabase
        .from('platform_clinic_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating clinic settings:', error);
      return null;
    }
  },

  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const { data, error } = await supabase
        .from('platform_app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching app settings:', error);
      return null;
    }
  },

  async updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings | null> {
    try {
      const current = await this.getAppSettings();
      if (!current) throw new Error('Settings not found');

      const { data, error } = await supabase
        .from('platform_app_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating app settings:', error);
      return null;
    }
  },

  async getSystemSettings(): Promise<SystemSettings | null> {
    try {
      const { data, error } = await supabase
        .from('platform_system_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return null;
    }
  },

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings | null> {
    try {
      const current = await this.getSystemSettings();
      if (!current) throw new Error('Settings not found');

      const { data, error } = await supabase
        .from('platform_system_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating system settings:', error);
      return null;
    }
  },

  async getFinanceSettings(): Promise<FinanceSettings | null> {
    try {
      const { data, error } = await supabase
        .from('platform_finance_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching finance settings:', error);
      return null;
    }
  },

  async updateFinanceSettings(settings: Partial<FinanceSettings>): Promise<FinanceSettings | null> {
    try {
      const current = await this.getFinanceSettings();
      if (!current) throw new Error('Settings not found');

      const { data, error } = await supabase
        .from('platform_finance_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating finance settings:', error);
      return null;
    }
  },

  async getAccountSettings(): Promise<AccountSetting[]> {
    try {
      const { data, error } = await supabase
        .from('platform_account_settings')
        .select('*')
        .order('category')
        .order('display_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching account settings:', error);
      return [];
    }
  },

  async updateAccountSetting(key: string, value: any): Promise<AccountSetting | null> {
    try {
      const { data, error } = await supabase
        .from('platform_account_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating account setting:', error);
      return null;
    }
  },

  async getOtherSettings(category: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('platform_other_settings')
        .select('*')
        .eq('category', category)
        .maybeSingle();

      if (error) throw error;
      return data?.settings_data || {};
    } catch (error) {
      console.error('Error fetching other settings:', error);
      return {};
    }
  },

  async updateOtherSettings(category: string, settingsData: any, description?: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('platform_other_settings')
        .upsert({
          category,
          settings_data: settingsData,
          description,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'category' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating other settings:', error);
      return null;
    }
  },

  async getAuditLog(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('settings_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }
  },
};
