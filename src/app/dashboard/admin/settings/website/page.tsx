import { useState, useEffect } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Globe, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { platformSettingsService, WebsiteSettings } from '../../../../../services/platformSettingsService';

export default function WebsiteSettingsPage() {
  const { currentColors } = useTheme();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await platformSettingsService.getWebsiteSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    const result = await platformSettingsService.updateWebsiteSettings(settings);

    if (result) {
      setMessage({ type: 'success', text: 'Website settings saved successfully' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }

    setSaving(false);
  };

  const handleChange = (field: keyof WebsiteSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="text-red-500">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe size={32} className="text-blue-500" />
          <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
            Website Settings
          </h1>
        </div>
        <p style={{ color: currentColors.textSecondary }}>
          Configure website appearance, SEO, and general settings
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: currentColors.cardBg,
          borderColor: currentColors.border,
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Site Name
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => handleChange('site_name', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Site Tagline
            </label>
            <input
              type="text"
              value={settings.site_tagline || ''}
              onChange={(e) => handleChange('site_tagline', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Site Description
            </label>
            <textarea
              value={settings.site_description || ''}
              onChange={(e) => handleChange('site_description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Contact Email
            </label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Contact Phone
            </label>
            <input
              type="tel"
              value={settings.contact_phone || ''}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              SEO Title
            </label>
            <input
              type="text"
              value={settings.seo_title || ''}
              onChange={(e) => handleChange('seo_title', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              SEO Description
            </label>
            <textarea
              value={settings.seo_description || ''}
              onChange={(e) => handleChange('seo_description', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Google Analytics ID
            </label>
            <input
              type="text"
              value={settings.google_analytics_id || ''}
              onChange={(e) => handleChange('google_analytics_id', e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Facebook Pixel ID
            </label>
            <input
              type="text"
              value={settings.facebook_pixel_id || ''}
              onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
              className="w-5 h-5"
            />
            <label className="text-sm font-medium" style={{ color: currentColors.text }}>
              Maintenance Mode
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cookie_consent_enabled}
              onChange={(e) => handleChange('cookie_consent_enabled', e.target.checked)}
              className="w-5 h-5"
            />
            <label className="text-sm font-medium" style={{ color: currentColors.text }}>
              Cookie Consent Banner
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Default Language
            </label>
            <select
              value={settings.default_language}
              onChange={(e) => handleChange('default_language', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            >
              <option value="America/Toronto">Eastern Time</option>
              <option value="America/Vancouver">Pacific Time</option>
              <option value="America/Edmonton">Mountain Time</option>
              <option value="America/Winnipeg">Central Time</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
