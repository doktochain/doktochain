import React, { useState, useEffect } from 'react';
import { Save, Globe, Code, Zap } from 'lucide-react';
import { platformSettingsService } from '../../../../../services/platformSettingsService';
import { LoadingSkeleton } from '../../../../../components/ui/LoadingSkeleton';

interface OtherSettings {
  integrations: {
    google_maps_api_key: string;
    recaptcha_site_key: string;
    recaptcha_secret_key: string;
    zoom_api_key: string;
    zoom_api_secret: string;
    intercom_app_id: string;
    zendesk_subdomain: string;
  };
  custom_scripts: {
    header_scripts: string;
    footer_scripts: string;
    custom_css: string;
  };
  features: {
    enable_live_chat: boolean;
    enable_feedback_widget: boolean;
    enable_announcement_bar: boolean;
    enable_cookie_consent: boolean;
  };
  advanced: {
    debug_mode: boolean;
    log_level: 'error' | 'warn' | 'info' | 'debug';
    cache_ttl_minutes: number;
    enable_compression: boolean;
  };
}

export default function OtherSettingsPage() {
  const [settings, setSettings] = useState<OtherSettings>({
    integrations: {
      google_maps_api_key: '',
      recaptcha_site_key: '',
      recaptcha_secret_key: '',
      zoom_api_key: '',
      zoom_api_secret: '',
      intercom_app_id: '',
      zendesk_subdomain: ''
    },
    custom_scripts: {
      header_scripts: '',
      footer_scripts: '',
      custom_css: ''
    },
    features: {
      enable_live_chat: false,
      enable_feedback_widget: true,
      enable_announcement_bar: false,
      enable_cookie_consent: true
    },
    advanced: {
      debug_mode: false,
      log_level: 'info',
      cache_ttl_minutes: 60,
      enable_compression: true
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
      const data = await platformSettingsService.getOtherSettings('other');
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load other settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await platformSettingsService.updateOtherSettings('other', settings);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Other Settings</h1>
          <p className="text-gray-600 mt-1">Configure integrations and advanced settings</p>
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
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Third-Party Integrations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps API Key
              </label>
              <input
                type="text"
                value={settings.integrations.google_maps_api_key}
                onChange={(e) => setSettings({
                  ...settings,
                  integrations: { ...settings.integrations, google_maps_api_key: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                reCAPTCHA Site Key
              </label>
              <input
                type="text"
                value={settings.integrations.recaptcha_site_key}
                onChange={(e) => setSettings({
                  ...settings,
                  integrations: { ...settings.integrations, recaptcha_site_key: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                reCAPTCHA Secret Key
              </label>
              <input
                type="password"
                value={settings.integrations.recaptcha_secret_key}
                onChange={(e) => setSettings({
                  ...settings,
                  integrations: { ...settings.integrations, recaptcha_secret_key: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoom API Key
              </label>
              <input
                type="text"
                value={settings.integrations.zoom_api_key}
                onChange={(e) => setSettings({
                  ...settings,
                  integrations: { ...settings.integrations, zoom_api_key: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoom API Secret
              </label>
              <input
                type="password"
                value={settings.integrations.zoom_api_secret}
                onChange={(e) => setSettings({
                  ...settings,
                  integrations: { ...settings.integrations, zoom_api_secret: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intercom App ID
              </label>
              <input
                type="text"
                value={settings.integrations.intercom_app_id}
                onChange={(e) => setSettings({
                  ...settings,
                  integrations: { ...settings.integrations, intercom_app_id: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Custom Scripts & Styles</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Scripts
              </label>
              <textarea
                value={settings.custom_scripts.header_scripts}
                onChange={(e) => setSettings({
                  ...settings,
                  custom_scripts: { ...settings.custom_scripts, header_scripts: e.target.value }
                })}
                rows={4}
                placeholder="Scripts to inject in <head>"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer Scripts
              </label>
              <textarea
                value={settings.custom_scripts.footer_scripts}
                onChange={(e) => setSettings({
                  ...settings,
                  custom_scripts: { ...settings.custom_scripts, footer_scripts: e.target.value }
                })}
                rows={4}
                placeholder="Scripts to inject before </body>"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom CSS
              </label>
              <textarea
                value={settings.custom_scripts.custom_css}
                onChange={(e) => setSettings({
                  ...settings,
                  custom_scripts: { ...settings.custom_scripts, custom_css: e.target.value }
                })}
                rows={6}
                placeholder="Custom CSS styles"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Additional Features</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.enable_live_chat}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, enable_live_chat: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Live Chat</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.enable_feedback_widget}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, enable_feedback_widget: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Feedback Widget</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.enable_announcement_bar}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, enable_announcement_bar: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Announcement Bar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features.enable_cookie_consent}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, enable_cookie_consent: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Cookie Consent</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Log Level
              </label>
              <select
                value={settings.advanced.log_level}
                onChange={(e) => setSettings({
                  ...settings,
                  advanced: { ...settings.advanced, log_level: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cache TTL (minutes)
              </label>
              <input
                type="number"
                value={settings.advanced.cache_ttl_minutes}
                onChange={(e) => setSettings({
                  ...settings,
                  advanced: { ...settings.advanced, cache_ttl_minutes: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.advanced.debug_mode}
                onChange={(e) => setSettings({
                  ...settings,
                  advanced: { ...settings.advanced, debug_mode: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Debug Mode</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.advanced.enable_compression}
                onChange={(e) => setSettings({
                  ...settings,
                  advanced: { ...settings.advanced, enable_compression: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Compression</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
