import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';
import { providerBillingService, PaymentGatewayConfig } from '../../services/providerBillingService';
import { useAuth } from '../../contexts/AuthContext';

const GATEWAYS = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept credit cards, Apple Pay, Google Pay',
    fees: '2.9% + $0.30 per transaction',
    logo: '💳',
  },
  {
    id: 'square',
    name: 'Square',
    description: 'All-in-one payment processing',
    fees: '2.6% + $0.10 per transaction',
    logo: '⬛',
  },
  {
    id: 'paypal',
    name: 'PayPal Business',
    description: 'Accept PayPal and credit cards',
    fees: '2.99% per transaction',
    logo: '🅿️',
  },
  {
    id: 'moneris',
    name: 'Moneris (Canadian)',
    description: 'Canadian payment processor with Interac',
    fees: 'Custom pricing',
    logo: '🇨🇦',
  },
];

export default function GatewaySetupInterface() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<Record<string, PaymentGatewayConfig>>({});
  const [activeGateway, setActiveGateway] = useState<string>('stripe');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (user) {
      loadConfigs();
    }
  }, [user]);

  const loadConfigs = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await providerBillingService.getGatewayConfigs(user.id);

    if (data) {
      const configMap: Record<string, PaymentGatewayConfig> = {};
      data.forEach((config) => {
        configMap[config.gateway_type] = config;
      });
      setConfigs(configMap);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const config: Partial<PaymentGatewayConfig> = {
      ...formData,
      provider_id: user.id,
      gateway_type: activeGateway,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await providerBillingService.saveGatewayConfig(config);

    if (!error && data) {
      setConfigs({ ...configs, [activeGateway]: data });
      toast.success('Gateway configuration saved successfully!');
    } else {
      toast.error('Failed to save configuration');
    }

    setSaving(false);
  };

  const toggleActive = async (gatewayType: string) => {
    const config = configs[gatewayType];
    if (!config) return;

    const { data } = await providerBillingService.toggleGatewayStatus(
      config.id,
      !config.is_active
    );

    if (data) {
      setConfigs({ ...configs, [gatewayType]: data });
    }
  };

  useEffect(() => {
    const config = configs[activeGateway];
    if (config) {
      setFormData({
        is_live_mode: config.is_live_mode,
        webhook_url: config.webhook_url || '',
        stripe_publishable_key: config.stripe_publishable_key || '',
        square_location_id: config.square_location_id || '',
        paypal_client_id: config.paypal_client_id || '',
        paypal_currency: config.paypal_currency || 'CAD',
        moneris_store_id: config.moneris_store_id || '',
        moneris_supports_interac: config.moneris_supports_interac || false,
        auto_capture: config.auto_capture,
        payout_schedule: config.payout_schedule || 'weekly',
        refund_policy: config.refund_policy || { days: 30, percentage: 100 },
      });
    } else {
      setFormData({
        is_live_mode: false,
        webhook_url: '',
        auto_capture: true,
        payout_schedule: 'weekly',
        refund_policy: { days: 30, percentage: 100 },
      });
    }
  }, [activeGateway, configs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {GATEWAYS.map((gateway) => {
          const config = configs[gateway.id];
          const isActive = config?.is_active;

          return (
            <button
              key={gateway.id}
              onClick={() => setActiveGateway(gateway.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                activeGateway === gateway.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl">{gateway.logo}</span>
                {config && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(gateway.id);
                    }}
                    className="text-sm"
                  >
                    {isActive ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {gateway.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {gateway.description}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {gateway.fees}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {GATEWAYS.find((g) => g.id === activeGateway)?.name} Configuration
          </h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.is_live_mode || false}
                onChange={(e) =>
                  setFormData({ ...formData, is_live_mode: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">Live Mode</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {activeGateway === 'stripe' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Publishable Key
                </label>
                <div className="relative">
                  <input
                    type={showKeys.stripe_pub ? 'text' : 'password'}
                    value={formData.stripe_publishable_key || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, stripe_publishable_key: e.target.value })
                    }
                    placeholder="pk_live_..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowKeys({ ...showKeys, stripe_pub: !showKeys.stripe_pub })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showKeys.stripe_pub ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeGateway === 'square' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location ID
                </label>
                <input
                  type="text"
                  value={formData.square_location_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, square_location_id: e.target.value })
                  }
                  placeholder="Enter Square Location ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          {activeGateway === 'paypal' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={formData.paypal_client_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, paypal_client_id: e.target.value })
                  }
                  placeholder="Enter PayPal Client ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <select
                  value={formData.paypal_currency || 'CAD'}
                  onChange={(e) =>
                    setFormData({ ...formData, paypal_currency: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
            </>
          )}

          {activeGateway === 'moneris' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Store ID
                </label>
                <input
                  type="text"
                  value={formData.moneris_store_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, moneris_store_id: e.target.value })
                  }
                  placeholder="Enter Moneris Store ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.moneris_supports_interac || false}
                  onChange={(e) =>
                    setFormData({ ...formData, moneris_supports_interac: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Enable Interac Support
                </span>
              </label>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook URL (Optional)
            </label>
            <input
              type="url"
              value={formData.webhook_url || ''}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://your-domain.com/webhooks"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payout Schedule
            </label>
            <select
              value={formData.payout_schedule || 'weekly'}
              onChange={(e) =>
                setFormData({ ...formData, payout_schedule: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.auto_capture || false}
              onChange={(e) =>
                setFormData({ ...formData, auto_capture: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Auto-capture payments (recommended)
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
