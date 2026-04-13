import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Settings } from 'lucide-react';
import { platformSettingsService } from '../../../../../services/platformSettingsService';
import { LoadingSkeleton } from '../../../../../components/ui/LoadingSkeleton';

interface SettingItem {
  key: string;
  value: string;
  category: string;
  description: string;
}

export default function AccountSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await platformSettingsService.getAccountSettings();
      if (data && data.length > 0) {
        setSettings(data.map(s => ({
          key: s.key,
          value: String(s.value ?? ''),
          category: s.category,
          description: s.description ?? '',
        })));
      } else {
        setSettings([
          { key: 'default_timezone', value: 'America/Toronto', category: 'General', description: 'Default timezone for users' },
          { key: 'allow_registration', value: 'true', category: 'Access', description: 'Allow new user registration' },
          { key: 'require_email_verification', value: 'true', category: 'Access', description: 'Require email verification' },
          { key: 'password_reset_expiry_hours', value: '24', category: 'Security', description: 'Password reset link expiry' }
        ]);
      }
    } catch (error) {
      console.error('Failed to load account settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      for (const s of settings) {
        if (s.key) {
          await platformSettingsService.updateAccountSetting(s.key, s.value);
        }
      }
      setMessage({ type: 'success', text: 'Account settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const addSetting = () => {
    setSettings([...settings, { key: '', value: '', category: 'General', description: '' }]);
  };

  const removeSetting = (index: number) => {
    setSettings(settings.filter((_, i) => i !== index));
  };

  const updateSetting = (index: number, field: keyof SettingItem, value: string) => {
    const updated = [...settings];
    updated[index] = { ...updated[index], [field]: value };
    setSettings(updated);
  };

  const categories = ['General', 'Access', 'Security', 'Notifications', 'Integration', 'Other'];

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
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Configure custom account settings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addSetting}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" />
            Add Setting
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Custom Settings</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {settings.map((setting, index) => (
            <div key={index} className="p-6 hover:bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setting Key
                  </label>
                  <input
                    type="text"
                    value={setting.key}
                    onChange={(e) => updateSetting(index, 'key', e.target.value)}
                    placeholder="setting_key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={setting.category}
                    onChange={(e) => updateSetting(index, 'category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value
                </label>
                <input
                  type="text"
                  value={setting.value}
                  onChange={(e) => updateSetting(index, 'value', e.target.value)}
                  placeholder="Setting value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={setting.description}
                    onChange={(e) => updateSetting(index, 'description', e.target.value)}
                    placeholder="Brief description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => removeSetting(index)}
                  className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove setting"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {settings.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No custom settings configured. Click "Add Setting" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
