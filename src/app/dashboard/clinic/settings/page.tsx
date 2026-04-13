import { useState, useEffect } from 'react';
import { Settings, Bell, Shield, CreditCard, Save } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic } from '../../../../services/clinicService';
import { supabase } from '../../../../lib/supabase';

type TabType = 'general' | 'notifications' | 'billing' | 'security';

export default function ClinicSettingsPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const [generalSettings, setGeneralSettings] = useState({
    max_providers: 10,
    subscription_plan: 'basic',
    billing_model: 'percentage',
    platform_fee_percentage: 10,
  });

  const [notifSettings, setNotifSettings] = useState({
    email_new_affiliation: true,
    email_provider_schedule: true,
    email_platform_updates: true,
    push_new_affiliation: true,
    push_messages: true,
  });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        setGeneralSettings({
          max_providers: c.max_providers,
          subscription_plan: c.subscription_plan,
          billing_model: c.billing_model,
          platform_fee_percentage: c.platform_fee_percentage,
        });
      }

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id);

      if (prefs && prefs.length > 0) {
        const map: Record<string, any> = {};
        prefs.forEach((p: any) => { map[p.category] = p; });
        setNotifSettings({
          email_new_affiliation: map['affiliation']?.email_enabled ?? true,
          email_provider_schedule: map['schedule']?.email_enabled ?? true,
          email_platform_updates: map['platform']?.email_enabled ?? true,
          push_new_affiliation: map['affiliation']?.push_enabled ?? true,
          push_messages: map['messages']?.push_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!clinic) return;
    setSaving(true);
    setMessage('');
    try {
      await clinicService.updateClinic(clinic.id, generalSettings);
      setMessage('General settings saved successfully.');
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setMessage('');
    try {
      const categories = [
        { category: 'affiliation', email_enabled: notifSettings.email_new_affiliation, push_enabled: notifSettings.push_new_affiliation },
        { category: 'schedule', email_enabled: notifSettings.email_provider_schedule, push_enabled: true },
        { category: 'platform', email_enabled: notifSettings.email_platform_updates, push_enabled: true },
        { category: 'messages', email_enabled: true, push_enabled: notifSettings.push_messages },
      ];

      for (const cat of categories) {
        await supabase
          .from('notification_preferences')
          .upsert(
            { user_id: user!.id, category: cat.category, email_enabled: cat.email_enabled, push_enabled: cat.push_enabled },
            { onConflict: 'user_id,category' }
          );
      }
      setMessage('Notification settings saved successfully.');
    } catch (error) {
      console.error('Error saving notifications:', error);
      setMessage('Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: TabType; label: string; icon: typeof Settings }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'security', label: 'Security', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Clinic Settings</h1>
        <p className="text-gray-500 mt-1">Configure your clinic preferences and account settings</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setMessage(''); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <tab.icon size={16} /> {tab.label}
            </div>
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl space-y-5">
          <h3 className="text-lg font-semibold text-gray-800">General Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
              <select
                value={generalSettings.subscription_plan}
                onChange={(e) => setGeneralSettings({ ...generalSettings, subscription_plan: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Providers</label>
              <input
                type="number"
                value={generalSettings.max_providers}
                onChange={(e) => setGeneralSettings({ ...generalSettings, max_providers: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Model</label>
              <select
                value={generalSettings.billing_model}
                onChange={(e) => setGeneralSettings({ ...generalSettings, billing_model: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Fee</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee (%)</label>
              <input
                type="number"
                step="0.5"
                value={generalSettings.platform_fee_percentage}
                onChange={(e) => setGeneralSettings({ ...generalSettings, platform_fee_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSaveGeneral}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl space-y-5">
          <h3 className="text-lg font-semibold text-gray-800">Notification Preferences</h3>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Email Notifications</h4>
            {[
              { key: 'email_new_affiliation', label: 'New affiliation requests' },
              { key: 'email_provider_schedule', label: 'Provider schedule changes' },
              { key: 'email_platform_updates', label: 'Platform updates and announcements' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-sm text-gray-700">{item.label}</span>
                <input
                  type="checkbox"
                  checked={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </label>
            ))}

            <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide mt-6">Push Notifications</h4>
            {[
              { key: 'push_new_affiliation', label: 'New affiliation requests' },
              { key: 'push_messages', label: 'New messages' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-sm text-gray-700">{item.label}</span>
                <input
                  type="checkbox"
                  checked={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
          <button
            onClick={handleSaveNotifications}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Billing Information</h3>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Current Plan</span>
                <span className="font-medium capitalize">{clinic?.subscription_plan}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Billing Model</span>
                <span className="font-medium capitalize">{clinic?.billing_model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Platform Fee</span>
                <span className="font-medium">{clinic?.platform_fee_percentage}%</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              To upgrade your plan or modify billing arrangements, please contact the platform administrator.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                  Not Enabled
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Data Access Logs</p>
                  <p className="text-sm text-gray-500">View audit trail of data access events</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Enabled
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Verification Status</p>
                  <p className="text-sm text-gray-500">Clinic identity and credential verification</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  clinic?.is_verified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {clinic?.is_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
