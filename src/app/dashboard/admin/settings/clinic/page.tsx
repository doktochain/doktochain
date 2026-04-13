import { useState, useEffect } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Building2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { platformSettingsService, ClinicSettings } from '../../../../../services/platformSettingsService';

export default function ClinicSettingsPage() {
  const { currentColors } = useTheme();
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await platformSettingsService.getClinicSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    const result = await platformSettingsService.updateClinicSettings(settings);

    if (result) {
      setMessage({ type: 'success', text: 'Clinic settings saved successfully' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }

    setSaving(false);
  };

  const handleChange = (field: keyof ClinicSettings, value: any) => {
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
          <Building2 size={32} className="text-blue-500" />
          <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
            Clinic Settings
          </h1>
        </div>
        <p style={{ color: currentColors.textSecondary }}>
          Configure clinic operational settings and booking policies
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
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: currentColors.text }}>
              Appointment Settings
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
                  Default Appointment Duration (minutes)
                </label>
                <input
                  type="number"
                  value={settings.default_appointment_duration}
                  onChange={(e) => handleChange('default_appointment_duration', parseInt(e.target.value))}
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
                  Booking Window (days)
                </label>
                <input
                  type="number"
                  value={settings.booking_window_days}
                  onChange={(e) => handleChange('booking_window_days', parseInt(e.target.value))}
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
                  Minimum Booking Notice (hours)
                </label>
                <input
                  type="number"
                  value={settings.min_booking_notice_hours}
                  onChange={(e) => handleChange('min_booking_notice_hours', parseInt(e.target.value))}
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
                  Max Booking Notice (days)
                </label>
                <input
                  type="number"
                  value={settings.max_booking_notice_days}
                  onChange={(e) => handleChange('max_booking_notice_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: currentColors.background,
                    borderColor: currentColors.border,
                    color: currentColors.text,
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: currentColors.text }}>
              Booking Options
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allow_same_day_booking}
                  onChange={(e) => handleChange('allow_same_day_booking', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Allow Same-Day Booking
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allow_waitlist}
                  onChange={(e) => handleChange('allow_waitlist', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Allow Waitlist
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.auto_confirm_appointments}
                  onChange={(e) => handleChange('auto_confirm_appointments', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Auto-Confirm Appointments
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.require_payment_upfront}
                  onChange={(e) => handleChange('require_payment_upfront', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Require Payment Upfront
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.telemedicine_enabled}
                  onChange={(e) => handleChange('telemedicine_enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Telemedicine Enabled
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: currentColors.text }}>
              Cancellation Policy
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentColors.text }}>
                  Cancellation Window (hours)
                </label>
                <input
                  type="number"
                  value={settings.cancellation_window_hours}
                  onChange={(e) => handleChange('cancellation_window_hours', parseInt(e.target.value))}
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
                  Cancellation Fee Amount ($)
                </label>
                <input
                  type="number"
                  value={settings.cancellation_fee_amount || 0}
                  onChange={(e) => handleChange('cancellation_fee_amount', parseFloat(e.target.value))}
                  disabled={!settings.cancellation_fee_enabled}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 disabled:opacity-50"
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
                  checked={settings.cancellation_fee_enabled}
                  onChange={(e) => handleChange('cancellation_fee_enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Cancellation Fee Enabled
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.no_show_fee_enabled}
                  onChange={(e) => handleChange('no_show_fee_enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  No-Show Fee Enabled
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: currentColors.text }}>
              Access Control
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.provider_approval_required}
                  onChange={(e) => handleChange('provider_approval_required', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Provider Approval Required
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.patient_id_verification_required}
                  onChange={(e) => handleChange('patient_id_verification_required', e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium" style={{ color: currentColors.text }}>
                  Patient ID Verification Required
                </label>
              </div>
            </div>
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
