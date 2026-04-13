import React, { useState, useEffect } from 'react';
import { Save, Smartphone, Bell, Palette, Zap } from 'lucide-react';
import { platformSettingsService } from '../../../../../services/platformSettingsService';
import { LoadingSkeleton } from '../../../../../components/ui/LoadingSkeleton';
import { ImageUploader } from '../../../../../components/ui/ImageUploader';

interface AppSettings {
  app_name: string;
  app_version: string;
  min_supported_version: string;
  force_update_enabled: boolean;
  maintenance_mode: boolean;
  app_icon_url: string;
  splash_screen_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  dark_mode_enabled: boolean;
  push_notifications_enabled: boolean;
  firebase_config: {
    apiKey: string;
    projectId: string;
    messagingSenderId: string;
    appId: string;
  };
  features: {
    telemedicine: boolean;
    pharmacy: boolean;
    lab_results: boolean;
    health_tracking: boolean;
    family_accounts: boolean;
    prescription_refills: boolean;
  };
  analytics: {
    google_analytics_id: string;
    mixpanel_token: string;
    amplitude_api_key: string;
  };
}

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    app_name: 'DoktoChain',
    app_version: '1.0.0',
    min_supported_version: '1.0.0',
    force_update_enabled: false,
    maintenance_mode: false,
    app_icon_url: '',
    splash_screen_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#10b981',
    accent_color: '#f59e0b',
    dark_mode_enabled: true,
    push_notifications_enabled: true,
    firebase_config: {
      apiKey: '',
      projectId: '',
      messagingSenderId: '',
      appId: ''
    },
    features: {
      telemedicine: true,
      pharmacy: true,
      lab_results: true,
      health_tracking: true,
      family_accounts: true,
      prescription_refills: true
    },
    analytics: {
      google_analytics_id: '',
      mixpanel_token: '',
      amplitude_api_key: ''
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
      const data = await platformSettingsService.getAppSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await platformSettingsService.updateAppSettings(settings);
      setMessage({ type: 'success', text: 'App settings saved successfully' });
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
          <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
          <p className="text-gray-600 mt-1">Configure mobile app settings and features</p>
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
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Name
              </label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Version
              </label>
              <input
                type="text"
                value={settings.app_version}
                onChange={(e) => setSettings({ ...settings, app_version: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Supported Version
              </label>
              <input
                type="text"
                value={settings.min_supported_version}
                onChange={(e) => setSettings({ ...settings, min_supported_version: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.force_update_enabled}
                  onChange={(e) => setSettings({ ...settings, force_update_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Force Update</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Maintenance Mode</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Branding & Theme</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Icon
              </label>
              <ImageUploader
                value={settings.app_icon_url}
                onChange={(url) => setSettings({ ...settings, app_icon_url: url })}
                bucket="app-assets"
                folder="icons"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Splash Screen
              </label>
              <ImageUploader
                value={settings.splash_screen_url}
                onChange={(url) => setSettings({ ...settings, splash_screen_url: url })}
                bucket="app-assets"
                folder="splash"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.dark_mode_enabled}
                onChange={(e) => setSettings({ ...settings, dark_mode_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Dark Mode</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.push_notifications_enabled}
                onChange={(e) => setSettings({ ...settings, push_notifications_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Push Notifications</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firebase API Key
                </label>
                <input
                  type="text"
                  value={settings.firebase_config.apiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    firebase_config: { ...settings.firebase_config, apiKey: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firebase Project ID
                </label>
                <input
                  type="text"
                  value={settings.firebase_config.projectId}
                  onChange={(e) => setSettings({
                    ...settings,
                    firebase_config: { ...settings.firebase_config, projectId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  value={settings.firebase_config.messagingSenderId}
                  onChange={(e) => setSettings({
                    ...settings,
                    firebase_config: { ...settings.firebase_config, messagingSenderId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App ID
                </label>
                <input
                  type="text"
                  value={settings.firebase_config.appId}
                  onChange={(e) => setSettings({
                    ...settings,
                    firebase_config: { ...settings.firebase_config, appId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Feature Flags</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.telemedicine}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, telemedicine: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Telemedicine</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.pharmacy}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, pharmacy: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Pharmacy</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.lab_results}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, lab_results: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Lab Results</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.health_tracking}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, health_tracking: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Health Tracking</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.family_accounts}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, family_accounts: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Family Accounts</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.prescription_refills}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, prescription_refills: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Prescription Refills</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Analytics ID
              </label>
              <input
                type="text"
                value={settings.analytics.google_analytics_id}
                onChange={(e) => setSettings({
                  ...settings,
                  analytics: { ...settings.analytics, google_analytics_id: e.target.value }
                })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mixpanel Token
              </label>
              <input
                type="text"
                value={settings.analytics.mixpanel_token}
                onChange={(e) => setSettings({
                  ...settings,
                  analytics: { ...settings.analytics, mixpanel_token: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amplitude API Key
              </label>
              <input
                type="text"
                value={settings.analytics.amplitude_api_key}
                onChange={(e) => setSettings({
                  ...settings,
                  analytics: { ...settings.analytics, amplitude_api_key: e.target.value }
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
