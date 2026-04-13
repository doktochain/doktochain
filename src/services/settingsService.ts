import { supabase } from '../lib/supabase';

export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  timezone: string;
  date_format: string;
  time_format: string;
  preferred_providers?: string[];
  preferred_pharmacies?: string[];
  calendar_sync_enabled: boolean;
  calendar_provider?: string;
  appointment_reminder_email: boolean;
  appointment_reminder_sms: boolean;
  appointment_reminder_push: boolean;
  reminder_advance_hours: number;
  session_timeout_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: string;
  share_health_records_with_providers: boolean;
  allow_research_participation: boolean;
  marketing_emails: boolean;
  marketing_sms: boolean;
  third_party_data_sharing: boolean;
  anonymous_usage_analytics: boolean;
  show_online_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessibilitySettings {
  id: string;
  user_id: string;
  font_size: string;
  high_contrast_mode: boolean;
  screen_reader_optimized: boolean;
  reduced_motion: boolean;
  simplified_interface: boolean;
  voice_commands_enabled: boolean;
  keyboard_shortcuts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  login_timestamp: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  operating_system?: string;
  location_city?: string;
  location_country?: string;
  login_method?: string;
  success: boolean;
  failure_reason?: string;
  session_id?: string;
  created_at: string;
}

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_name: string;
  device_type?: string;
  device_fingerprint?: string;
  browser?: string;
  operating_system?: string;
  last_used: string;
  trusted_at: string;
  is_active: boolean;
  created_at: string;
}

export interface DataExportRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  processed_at?: string;
  download_url?: string;
  expires_at?: string;
  file_size_bytes?: number;
  created_at: string;
}

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

export const FONT_SIZES = [
  { value: 'small', label: 'Small', scale: 0.875 },
  { value: 'medium', label: 'Medium', scale: 1 },
  { value: 'large', label: 'Large', scale: 1.125 },
  { value: 'xlarge', label: 'Extra Large', scale: 1.25 },
];

export const settingsService = {
  // User Settings
  async getUserSettings(userId: string): Promise<{
    data: UserSettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateUserSettings(
    userId: string,
    updates: Partial<UserSettings>
  ): Promise<{
    data: UserSettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          { ...updates, user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Privacy Settings
  async getPrivacySettings(userId: string): Promise<{
    data: PrivacySettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updatePrivacySettings(
    userId: string,
    updates: Partial<PrivacySettings>
  ): Promise<{
    data: PrivacySettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .upsert(
          { ...updates, user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Accessibility Settings
  async getAccessibilitySettings(userId: string): Promise<{
    data: AccessibilitySettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_accessibility_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updateAccessibilitySettings(
    userId: string,
    updates: Partial<AccessibilitySettings>
  ): Promise<{
    data: AccessibilitySettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_accessibility_settings')
        .upsert(
          { ...updates, user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Login History
  async getLoginHistory(userId: string, limit = 20): Promise<{
    data: LoginHistory[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('login_timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Trusted Devices
  async getTrustedDevices(userId: string): Promise<{
    data: TrustedDevice[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async removeTrustedDevice(deviceId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ is_active: false })
        .eq('id', deviceId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  // Data Export
  async requestDataExport(userId: string, type: string): Promise<{
    data: DataExportRequest | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          user_id: userId,
          request_type: type,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getDataExportRequests(userId: string): Promise<{
    data: DataExportRequest[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Account Deletion
  async requestAccountDeletion(userId: string, reason?: string): Promise<{
    data: any;
    error: Error | null;
  }> {
    try {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 30);

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: userId,
          reason,
          status: 'pending',
          scheduled_deletion_date: scheduledDate.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // Change Password
  async changePassword(newPassword: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  // Initialize default settings
  async initializeSettings(userId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      await Promise.all([
        supabase.from('user_settings').upsert({ user_id: userId }, { onConflict: 'user_id' }),
        supabase
          .from('user_privacy_settings')
          .upsert({ user_id: userId }, { onConflict: 'user_id' }),
        supabase
          .from('user_accessibility_settings')
          .upsert({ user_id: userId }, { onConflict: 'user_id' }),
      ]);

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  // Helper functions
  getLanguageName(code: string): string {
    const lang = LANGUAGES.find((l) => l.code === code);
    return lang ? lang.name : code;
  },

  getFontSizeLabel(size: string): string {
    const font = FONT_SIZES.find((f) => f.value === size);
    return font ? font.label : size;
  },

  formatLoginTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  },
};