import React, { useState, useEffect } from 'react';
import { Save, Mail, MessageSquare, Database, Shield, Clock } from 'lucide-react';
import { platformSettingsService } from '../../../../../services/platformSettingsService';
import { LoadingSkeleton } from '../../../../../components/ui/LoadingSkeleton';

interface SystemSettings {
  email: {
    provider: 'smtp' | 'sendgrid' | 'ses';
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    from_email: string;
    from_name: string;
    sendgrid_api_key: string;
    ses_access_key: string;
    ses_secret_key: string;
    ses_region: string;
  };
  sms: {
    provider: 'twilio' | 'vonage' | 'sns';
    twilio_account_sid: string;
    twilio_auth_token: string;
    twilio_phone_number: string;
    vonage_api_key: string;
    vonage_api_secret: string;
    sns_access_key: string;
    sns_secret_key: string;
    sns_region: string;
  };
  storage: {
    provider: 'supabase' | 's3' | 'azure';
    max_file_size_mb: number;
    allowed_file_types: string[];
    s3_bucket: string;
    s3_region: string;
    s3_access_key: string;
    s3_secret_key: string;
    azure_account: string;
    azure_key: string;
    azure_container: string;
  };
  security: {
    session_timeout_minutes: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    password_min_length: number;
    password_require_uppercase: boolean;
    password_require_lowercase: boolean;
    password_require_numbers: boolean;
    password_require_special: boolean;
    two_factor_required: boolean;
    ip_whitelist: string[];
  };
  api: {
    rate_limit_per_minute: number;
    rate_limit_per_hour: number;
    rate_limit_per_day: number;
    enable_cors: boolean;
    allowed_origins: string[];
    api_key_expiry_days: number;
  };
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    email: {
      provider: 'smtp',
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      from_email: '',
      from_name: 'DoktoChain',
      sendgrid_api_key: '',
      ses_access_key: '',
      ses_secret_key: '',
      ses_region: 'us-east-1'
    },
    sms: {
      provider: 'twilio',
      twilio_account_sid: '',
      twilio_auth_token: '',
      twilio_phone_number: '',
      vonage_api_key: '',
      vonage_api_secret: '',
      sns_access_key: '',
      sns_secret_key: '',
      sns_region: 'us-east-1'
    },
    storage: {
      provider: 'supabase',
      max_file_size_mb: 10,
      allowed_file_types: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      s3_bucket: '',
      s3_region: 'us-east-1',
      s3_access_key: '',
      s3_secret_key: '',
      azure_account: '',
      azure_key: '',
      azure_container: ''
    },
    security: {
      session_timeout_minutes: 60,
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: true,
      two_factor_required: false,
      ip_whitelist: []
    },
    api: {
      rate_limit_per_minute: 60,
      rate_limit_per_hour: 1000,
      rate_limit_per_day: 10000,
      enable_cors: true,
      allowed_origins: ['*'],
      api_key_expiry_days: 365
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await platformSettingsService.getSystemSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await platformSettingsService.updateSystemSettings(settings as any);
      setMessage({ type: 'success', text: 'System settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton type="form" rows={8} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure email, SMS, storage, and security settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Provider
              </label>
              <select
                value={settings.email.provider}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, provider: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="smtp">SMTP</option>
                <option value="sendgrid">SendGrid</option>
                <option value="ses">Amazon SES</option>
              </select>
            </div>

            {settings.email.provider === 'smtp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtp_host}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_host: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.email.smtp_port}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_port: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtp_username}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_username: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={settings.email.smtp_password}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_password: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {settings.email.provider === 'sendgrid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SendGrid API Key
                </label>
                <input
                  type="password"
                  value={settings.email.sendgrid_api_key}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, sendgrid_api_key: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={settings.email.from_email}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, from_email: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.email.from_name}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, from_name: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">SMS Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Provider
              </label>
              <select
                value={settings.sms.provider}
                onChange={(e) => setSettings({
                  ...settings,
                  sms: { ...settings.sms, provider: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="twilio">Twilio</option>
                <option value="vonage">Vonage</option>
                <option value="sns">Amazon SNS</option>
              </select>
            </div>

            {settings.sms.provider === 'twilio' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={settings.sms.twilio_account_sid}
                    onChange={(e) => setSettings({
                      ...settings,
                      sms: { ...settings.sms, twilio_account_sid: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={settings.sms.twilio_auth_token}
                    onChange={(e) => setSettings({
                      ...settings,
                      sms: { ...settings.sms, twilio_auth_token: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={settings.sms.twilio_phone_number}
                    onChange={(e) => setSettings({
                      ...settings,
                      sms: { ...settings.sms, twilio_phone_number: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Storage Configuration</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Provider
                </label>
                <select
                  value={settings.storage.provider}
                  onChange={(e) => setSettings({
                    ...settings,
                    storage: { ...settings.storage, provider: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="supabase">Supabase Storage</option>
                  <option value="s3">Amazon S3</option>
                  <option value="azure">Azure Blob Storage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={settings.storage.max_file_size_mb}
                  onChange={(e) => setSettings({
                    ...settings,
                    storage: { ...settings.storage, max_file_size_mb: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.security.session_timeout_minutes}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, session_timeout_minutes: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settings.security.max_login_attempts}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, max_login_attempts: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.security.lockout_duration_minutes}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, lockout_duration_minutes: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Min Length
              </label>
              <input
                type="number"
                value={settings.security.password_min_length}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, password_min_length: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.password_require_uppercase}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, password_require_uppercase: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require Uppercase Letters</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.password_require_lowercase}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, password_require_lowercase: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require Lowercase Letters</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.password_require_numbers}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, password_require_numbers: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require Numbers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.password_require_special}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, password_require_special: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require Special Characters</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.two_factor_required}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, two_factor_required: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require Two-Factor Authentication</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Rate Limiting</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per Minute
              </label>
              <input
                type="number"
                value={settings.api.rate_limit_per_minute}
                onChange={(e) => setSettings({
                  ...settings,
                  api: { ...settings.api, rate_limit_per_minute: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per Hour
              </label>
              <input
                type="number"
                value={settings.api.rate_limit_per_hour}
                onChange={(e) => setSettings({
                  ...settings,
                  api: { ...settings.api, rate_limit_per_hour: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per Day
              </label>
              <input
                type="number"
                value={settings.api.rate_limit_per_day}
                onChange={(e) => setSettings({
                  ...settings,
                  api: { ...settings.api, rate_limit_per_day: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
