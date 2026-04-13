import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  settingsService,
  UserSettings,
  PrivacySettings,
  AccessibilitySettings,
  LoginHistory,
  TrustedDevice,
  LANGUAGES,
  FONT_SIZES,
} from '../../../../services/settingsService';
import {
  User,
  Lock,
  Shield,
  Eye,
  Globe,
  Accessibility,
  Download,
  Trash2,
  Save,
  Smartphone,
  Monitor,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import ConsentManager from '../../../../components/patient/ConsentManager';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'privacy' | 'consents' | 'accessibility' | 'data'
  >('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings | null>(
    null
  );
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);

    const [settingsRes, privacyRes, accessibilityRes, historyRes, devicesRes] = await Promise.all([
      settingsService.getUserSettings(user.id),
      settingsService.getPrivacySettings(user.id),
      settingsService.getAccessibilitySettings(user.id),
      settingsService.getLoginHistory(user.id),
      settingsService.getTrustedDevices(user.id),
    ]);

    if (settingsRes.data) setUserSettings(settingsRes.data);
    if (privacyRes.data) setPrivacySettings(privacyRes.data);
    if (accessibilityRes.data) setAccessibilitySettings(accessibilityRes.data);
    if (historyRes.data) setLoginHistory(historyRes.data);
    if (devicesRes.data) setTrustedDevices(devicesRes.data);

    setLoading(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Please log in to access settings</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings & Preferences</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            <TabButton
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              icon={User}
              label="Profile"
            />
            <TabButton
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              icon={Lock}
              label="Security"
            />
            <TabButton
              active={activeTab === 'privacy'}
              onClick={() => setActiveTab('privacy')}
              icon={Eye}
              label="Privacy"
            />
            <TabButton
              active={activeTab === 'consents'}
              onClick={() => setActiveTab('consents')}
              icon={Shield}
              label="Data Consents"
            />
            <TabButton
              active={activeTab === 'accessibility'}
              onClick={() => setActiveTab('accessibility')}
              icon={Accessibility}
              label="Accessibility"
            />
            <TabButton
              active={activeTab === 'data'}
              onClick={() => setActiveTab('data')}
              icon={Download}
              label="Data & Account"
            />
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'profile' && (
                <ProfileTab
                  settings={userSettings}
                  onSave={async (updates) => {
                    setSaving(true);
                    const { error } = await settingsService.updateUserSettings(user.id, updates);
                    setSaving(false);
                    if (error) {
                      showMessage('error', 'Failed to save settings');
                    } else {
                      showMessage('success', 'Settings saved successfully');
                      loadSettings();
                    }
                  }}
                  saving={saving}
                />
              )}
              {activeTab === 'security' && (
                <SecurityTab
                  loginHistory={loginHistory}
                  trustedDevices={trustedDevices}
                  onRemoveDevice={async (deviceId) => {
                    const { error } = await settingsService.removeTrustedDevice(deviceId);
                    if (error) {
                      showMessage('error', 'Failed to remove device');
                    } else {
                      showMessage('success', 'Device removed successfully');
                      loadSettings();
                    }
                  }}
                  onChangePassword={async (newPassword) => {
                    const { error } = await settingsService.changePassword(newPassword);
                    if (error) {
                      showMessage('error', 'Failed to change password');
                    } else {
                      showMessage('success', 'Password changed successfully');
                    }
                  }}
                />
              )}
              {activeTab === 'privacy' && (
                <PrivacyTab
                  settings={privacySettings}
                  onSave={async (updates) => {
                    setSaving(true);
                    const { error } = await settingsService.updatePrivacySettings(user.id, updates);
                    setSaving(false);
                    if (error) {
                      showMessage('error', 'Failed to save privacy settings');
                    } else {
                      showMessage('success', 'Privacy settings saved successfully');
                      loadSettings();
                    }
                  }}
                  saving={saving}
                />
              )}
              {activeTab === 'consents' && <ConsentManager />}
              {activeTab === 'accessibility' && (
                <AccessibilityTab
                  settings={accessibilitySettings}
                  onSave={async (updates) => {
                    setSaving(true);
                    const { error } = await settingsService.updateAccessibilitySettings(
                      user.id,
                      updates
                    );
                    setSaving(false);
                    if (error) {
                      showMessage('error', 'Failed to save accessibility settings');
                    } else {
                      showMessage('success', 'Accessibility settings saved successfully');
                      loadSettings();
                    }
                  }}
                  saving={saving}
                />
              )}
              {activeTab === 'data' && (
                <DataTab
                  userId={user.id}
                  onMessage={showMessage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const ProfileTab: React.FC<{
  settings: UserSettings | null;
  onSave: (updates: Partial<UserSettings>) => void;
  saving: boolean;
}> = ({ settings, onSave, saving }) => {
  const [formData, setFormData] = useState({
    language: settings?.language || 'en',
    timezone: settings?.timezone || 'America/Toronto',
    date_format: settings?.date_format || 'MM/DD/YYYY',
    time_format: settings?.time_format || '12h',
    appointment_reminder_email: settings?.appointment_reminder_email ?? true,
    appointment_reminder_sms: settings?.appointment_reminder_sms ?? true,
    appointment_reminder_push: settings?.appointment_reminder_push ?? true,
    reminder_advance_hours: settings?.reminder_advance_hours || 24,
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Language & Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/Toronto">Eastern Time (Toronto)</option>
              <option value="America/Vancouver">Pacific Time (Vancouver)</option>
              <option value="America/Edmonton">Mountain Time (Edmonton)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Reminders</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.appointment_reminder_email}
              onChange={(e) =>
                setFormData({ ...formData, appointment_reminder_email: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Email reminders</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.appointment_reminder_sms}
              onChange={(e) =>
                setFormData({ ...formData, appointment_reminder_sms: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">SMS reminders</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.appointment_reminder_push}
              onChange={(e) =>
                setFormData({ ...formData, appointment_reminder_push: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Push notifications</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(formData)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const SecurityTab: React.FC<{
  loginHistory: LoginHistory[];
  trustedDevices: TrustedDevice[];
  onRemoveDevice: (deviceId: string) => void;
  onChangePassword: (newPassword: string) => void;
}> = ({ loginHistory, trustedDevices, onRemoveDevice, onChangePassword }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            Change Password
          </button>
        ) : (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newPassword === confirmPassword && newPassword.length >= 8) {
                    onChangePassword(newPassword);
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }
                }}
                disabled={newPassword !== confirmPassword || newPassword.length < 8}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Update Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trusted Devices</h3>
        <div className="space-y-2">
          {trustedDevices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {device.device_type === 'mobile' ? (
                  <Smartphone className="w-5 h-5 text-gray-400" />
                ) : (
                  <Monitor className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{device.device_name}</p>
                  <p className="text-sm text-gray-600">
                    Last used: {settingsService.formatLoginTime(device.last_used)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveDevice(device.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Login History</h3>
        <div className="space-y-2">
          {loginHistory.slice(0, 10).map((login) => (
            <div key={login.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">
                  {new Date(login.login_timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                {login.location_city && (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>{login.location_city}</span>
                  </>
                )}
                <span>{login.browser}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PrivacyTab: React.FC<{
  settings: PrivacySettings | null;
  onSave: (updates: Partial<PrivacySettings>) => void;
  saving: boolean;
}> = ({ settings, onSave, saving }) => {
  const [formData, setFormData] = useState({
    profile_visibility: settings?.profile_visibility || 'private',
    share_health_records_with_providers: settings?.share_health_records_with_providers ?? true,
    allow_research_participation: settings?.allow_research_participation ?? false,
    marketing_emails: settings?.marketing_emails ?? false,
    marketing_sms: settings?.marketing_sms ?? false,
    third_party_data_sharing: settings?.third_party_data_sharing ?? false,
    anonymous_usage_analytics: settings?.anonymous_usage_analytics ?? true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sharing</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.share_health_records_with_providers}
              onChange={(e) =>
                setFormData({ ...formData, share_health_records_with_providers: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Share health records with providers</p>
              <p className="text-xs text-gray-600">Allow your healthcare providers to access your health records</p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.allow_research_participation}
              onChange={(e) =>
                setFormData({ ...formData, allow_research_participation: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Participate in research studies</p>
              <p className="text-xs text-gray-600">Allow use of anonymized data for medical research</p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Communications</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.marketing_emails}
              onChange={(e) => setFormData({ ...formData, marketing_emails: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Receive marketing emails</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.marketing_sms}
              onChange={(e) => setFormData({ ...formData, marketing_sms: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Receive marketing SMS</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(formData)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const AccessibilityTab: React.FC<{
  settings: AccessibilitySettings | null;
  onSave: (updates: Partial<AccessibilitySettings>) => void;
  saving: boolean;
}> = ({ settings, onSave, saving }) => {
  const [formData, setFormData] = useState({
    font_size: settings?.font_size || 'medium',
    high_contrast_mode: settings?.high_contrast_mode ?? false,
    reduced_motion: settings?.reduced_motion ?? false,
    simplified_interface: settings?.simplified_interface ?? false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visual Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
            <select
              value={formData.font_size}
              onChange={(e) => setFormData({ ...formData, font_size: e.target.value })}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.high_contrast_mode}
              onChange={(e) => setFormData({ ...formData, high_contrast_mode: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">High contrast mode</p>
              <p className="text-xs text-gray-600">Increase contrast for better visibility</p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.reduced_motion}
              onChange={(e) => setFormData({ ...formData, reduced_motion: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Reduce motion</p>
              <p className="text-xs text-gray-600">Minimize animations and transitions</p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.simplified_interface}
              onChange={(e) => setFormData({ ...formData, simplified_interface: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Simplified interface</p>
              <p className="text-xs text-gray-600">Show a cleaner, less cluttered interface</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(formData)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const DataTab: React.FC<{
  userId: string;
  onMessage: (type: 'success' | 'error', text: string) => void;
}> = ({ userId, onMessage }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Your Data</h3>
        <p className="text-sm text-gray-600 mb-4">
          Download a copy of your personal data in accordance with GDPR
        </p>
        <button
          onClick={async () => {
            await settingsService.requestDataExport(userId, 'full_export');
            onMessage('success', 'Data export requested. You will receive an email when ready.');
          }}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
        >
          <Download className="w-5 h-5" />
          Request Data Export
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-red-900 mb-4">Delete Account</h3>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete Account
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
            <p className="text-sm text-red-800">
              Are you sure? Your account will be scheduled for deletion in 30 days.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await settingsService.requestAccountDeletion(userId);
                  onMessage('success', 'Account deletion scheduled for 30 days from now');
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};