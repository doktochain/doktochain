import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FinanceService, BillingConfig } from '../../../../../services/financeService';
import { Settings, Save, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react';

export default function BillingConfigPage() {
  const [configs, setConfigs] = useState<BillingConfig[]>([]);
  const [bookingFeeConfig, setBookingFeeConfig] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await FinanceService.getBillingConfigs();

      // Separate patient booking fee from other configs
      const bookingFee = data.find(c => c.config_key === 'patient_booking_fee');
      const otherConfigs = data.filter(c => c.config_key !== 'patient_booking_fee');

      setBookingFeeConfig(bookingFee || null);
      setConfigs(otherConfigs);
    } catch (error) {
      console.error('Error loading billing configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (config: BillingConfig) => {
    try {
      setSaving(config.id);
      await FinanceService.updateBillingConfig(config.id, {
        is_active: !config.is_active,
      });
      await loadConfigs();
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateConfig = async (config: BillingConfig, updates: Partial<BillingConfig>) => {
    try {
      setSaving(config.id);
      await FinanceService.updateBillingConfig(config.id, updates);
      await loadConfigs();
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Platform Billing Configuration
        </h1>
        <p className="text-gray-600 mt-1">
          Configure global billing settings for providers, pharmacies, and patients
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> Changes to billing configuration will affect all future transactions.
          Existing transactions will not be modified.
        </p>
      </div>

      {/* Patient Booking Fee Section */}
      {bookingFeeConfig && (
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                Patient Booking Fee
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {bookingFeeConfig.description}
              </p>
            </div>
            <button
              onClick={() => handleToggleActive(bookingFeeConfig)}
              disabled={saving === bookingFeeConfig.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                bookingFeeConfig.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {bookingFeeConfig.is_active ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  Active
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  Inactive
                </>
              )}
            </button>
          </div>

          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 font-medium">
              <strong>Required for Booking:</strong> Patients must pay this booking fee before they can complete appointment bookings. This fee must be activated to enable patient bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Fee Amount (CAD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={bookingFeeConfig.fixed_amount || 0}
                  onChange={(e) =>
                    handleUpdateConfig(bookingFeeConfig, {
                      fixed_amount: parseFloat(e.target.value),
                    })
                  }
                  onBlur={() => saving === bookingFeeConfig.id || handleUpdateConfig(bookingFeeConfig, {})}
                  disabled={saving === bookingFeeConfig.id}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  step="0.01"
                  min="0"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount charged per booking
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Charge (CAD)
              </label>
              <input
                type="number"
                value={bookingFeeConfig.maximum_charge || 0}
                onChange={(e) =>
                  handleUpdateConfig(bookingFeeConfig, {
                    maximum_charge: parseFloat(e.target.value),
                  })
                }
                onBlur={() => saving === bookingFeeConfig.id || handleUpdateConfig(bookingFeeConfig, {})}
                disabled={saving === bookingFeeConfig.id}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum fee limit (optional)
              </p>
            </div>
          </div>

          {bookingFeeConfig.fixed_amount && bookingFeeConfig.fixed_amount > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Current Setting:</strong> Patients will pay ${bookingFeeConfig.fixed_amount.toFixed(2)} CAD per appointment booking.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6">
        {configs.map((config) => (
          <div key={config.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {config.user_type} Billing
                </h2>
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
              </div>
              <button
                onClick={() => handleToggleActive(config)}
                disabled={saving === config.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  config.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.is_active ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    Active
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    Inactive
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Model
                </label>
                <select
                  value={config.billing_model}
                  onChange={(e) =>
                    handleUpdateConfig(config, {
                      billing_model: e.target.value as 'fixed' | 'percentage',
                    })
                  }
                  disabled={saving === config.id}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>

              {config.billing_model === 'fixed' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Amount (CAD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={config.fixed_amount || 0}
                      onChange={(e) =>
                        handleUpdateConfig(config, {
                          fixed_amount: parseFloat(e.target.value),
                        })
                      }
                      onBlur={() => saving === config.id || handleUpdateConfig(config, {})}
                      disabled={saving === config.id}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentage Rate (%)
                  </label>
                  <input
                    type="number"
                    value={config.percentage_rate || 0}
                    onChange={(e) =>
                      handleUpdateConfig(config, {
                        percentage_rate: parseFloat(e.target.value),
                      })
                    }
                    onBlur={() => saving === config.id || handleUpdateConfig(config, {})}
                    disabled={saving === config.id}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Charge (CAD)
                </label>
                <input
                  type="number"
                  value={config.minimum_charge || 0}
                  onChange={(e) =>
                    handleUpdateConfig(config, {
                      minimum_charge: parseFloat(e.target.value),
                    })
                  }
                  onBlur={() => saving === config.id || handleUpdateConfig(config, {})}
                  disabled={saving === config.id}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Charge (CAD)
                </label>
                <input
                  type="number"
                  value={config.maximum_charge || 0}
                  onChange={(e) =>
                    handleUpdateConfig(config, {
                      maximum_charge: parseFloat(e.target.value),
                    })
                  }
                  onBlur={() => saving === config.id || handleUpdateConfig(config, {})}
                  disabled={saving === config.id}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Cycle
                </label>
                <select
                  value={config.billing_cycle}
                  onChange={(e) =>
                    handleUpdateConfig(config, {
                      billing_cycle: e.target.value as any,
                    })
                  }
                  disabled={saving === config.id}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Threshold (CAD)
                </label>
                <input
                  type="number"
                  value={config.payout_threshold || 0}
                  onChange={(e) =>
                    handleUpdateConfig(config, {
                      payout_threshold: parseFloat(e.target.value),
                    })
                  }
                  onBlur={() => saving === config.id || handleUpdateConfig(config, {})}
                  disabled={saving === config.id}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {config.billing_model === 'percentage' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Example:</strong> On a $100 transaction, the platform fee would be $
                  {((config.percentage_rate || 0) * 1).toFixed(2)}
                  {config.minimum_charge && (config.percentage_rate || 0) * 1 < config.minimum_charge
                    ? ` (minimum ${config.minimum_charge} applies)`
                    : ''}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
