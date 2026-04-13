import React, { useState, useEffect } from 'react';
import { Save, DollarSign, CreditCard, Percent, Receipt } from 'lucide-react';
import { platformSettingsService } from '../../../../../services/platformSettingsService';
import { LoadingSkeleton } from '../../../../../components/ui/LoadingSkeleton';

interface FinanceSettings {
  default_currency: string;
  supported_currencies: string[];
  currency_format: {
    symbol_position: 'before' | 'after';
    decimal_separator: string;
    thousand_separator: string;
    decimal_places: number;
  };
  tax: {
    enabled: boolean;
    default_rate: number;
    inclusive: boolean;
    display_on_prices: boolean;
    tax_id_label: string;
  };
  payment_gateways: {
    stripe: {
      enabled: boolean;
      publishable_key: string;
      secret_key: string;
      webhook_secret: string;
    };
    paypal: {
      enabled: boolean;
      client_id: string;
      secret: string;
      mode: 'sandbox' | 'live';
    };
    square: {
      enabled: boolean;
      application_id: string;
      access_token: string;
      location_id: string;
    };
  };
  invoicing: {
    prefix: string;
    starting_number: number;
    due_days: number;
    late_fee_enabled: boolean;
    late_fee_percentage: number;
    auto_send: boolean;
    show_payment_link: boolean;
  };
  refunds: {
    allow_partial: boolean;
    auto_approval_threshold: number;
    refund_period_days: number;
    processing_fee_refundable: boolean;
  };
}

export default function FinanceSettingsPage() {
  const [settings, setSettings] = useState<FinanceSettings>({
    default_currency: 'USD',
    supported_currencies: ['USD', 'CAD', 'EUR', 'GBP'],
    currency_format: {
      symbol_position: 'before',
      decimal_separator: '.',
      thousand_separator: ',',
      decimal_places: 2
    },
    tax: {
      enabled: true,
      default_rate: 13,
      inclusive: false,
      display_on_prices: true,
      tax_id_label: 'HST'
    },
    payment_gateways: {
      stripe: {
        enabled: true,
        publishable_key: '',
        secret_key: '',
        webhook_secret: ''
      },
      paypal: {
        enabled: false,
        client_id: '',
        secret: '',
        mode: 'sandbox'
      },
      square: {
        enabled: false,
        application_id: '',
        access_token: '',
        location_id: ''
      }
    },
    invoicing: {
      prefix: 'INV',
      starting_number: 1000,
      due_days: 30,
      late_fee_enabled: false,
      late_fee_percentage: 5,
      auto_send: true,
      show_payment_link: true
    },
    refunds: {
      allow_partial: true,
      auto_approval_threshold: 100,
      refund_period_days: 30,
      processing_fee_refundable: false
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
      const data = await platformSettingsService.getFinanceSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load finance settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await platformSettingsService.updateFinanceSettings(settings);
      setMessage({ type: 'success', text: 'Finance settings saved successfully' });
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
          <h1 className="text-2xl font-bold text-gray-900">Finance Settings</h1>
          <p className="text-gray-600 mt-1">Configure currencies, taxes, and payment settings</p>
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
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Currency Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">US Dollar (USD)</option>
                  <option value="CAD">Canadian Dollar (CAD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">British Pound (GBP)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol Position
                </label>
                <select
                  value={settings.currency_format.symbol_position}
                  onChange={(e) => setSettings({
                    ...settings,
                    currency_format: { ...settings.currency_format, symbol_position: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="before">Before amount ($100)</option>
                  <option value="after">After amount (100$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimal Separator
                </label>
                <input
                  type="text"
                  value={settings.currency_format.decimal_separator}
                  onChange={(e) => setSettings({
                    ...settings,
                    currency_format: { ...settings.currency_format, decimal_separator: e.target.value }
                  })}
                  maxLength={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thousand Separator
                </label>
                <input
                  type="text"
                  value={settings.currency_format.thousand_separator}
                  onChange={(e) => setSettings({
                    ...settings,
                    currency_format: { ...settings.currency_format, thousand_separator: e.target.value }
                  })}
                  maxLength={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tax Configuration</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.tax.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  tax: { ...settings.tax, enabled: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Tax</span>
            </label>
            {settings.tax.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.tax.default_rate}
                    onChange={(e) => setSettings({
                      ...settings,
                      tax: { ...settings.tax, default_rate: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID Label
                  </label>
                  <input
                    type="text"
                    value={settings.tax.tax_id_label}
                    onChange={(e) => setSettings({
                      ...settings,
                      tax: { ...settings.tax, tax_id_label: e.target.value }
                    })}
                    placeholder="e.g., HST, GST, VAT"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.tax.inclusive}
                    onChange={(e) => setSettings({
                      ...settings,
                      tax: { ...settings.tax, inclusive: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Tax Inclusive Pricing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.tax.display_on_prices}
                    onChange={(e) => setSettings({
                      ...settings,
                      tax: { ...settings.tax, display_on_prices: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Display Tax on Prices</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Gateways</h2>
          </div>
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Stripe</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment_gateways.stripe.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      payment_gateways: {
                        ...settings.payment_gateways,
                        stripe: { ...settings.payment_gateways.stripe, enabled: e.target.checked }
                      }
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>
              {settings.payment_gateways.stripe.enabled && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publishable Key
                    </label>
                    <input
                      type="text"
                      value={settings.payment_gateways.stripe.publishable_key}
                      onChange={(e) => setSettings({
                        ...settings,
                        payment_gateways: {
                          ...settings.payment_gateways,
                          stripe: { ...settings.payment_gateways.stripe, publishable_key: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={settings.payment_gateways.stripe.secret_key}
                      onChange={(e) => setSettings({
                        ...settings,
                        payment_gateways: {
                          ...settings.payment_gateways,
                          stripe: { ...settings.payment_gateways.stripe, secret_key: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook Secret
                    </label>
                    <input
                      type="password"
                      value={settings.payment_gateways.stripe.webhook_secret}
                      onChange={(e) => setSettings({
                        ...settings,
                        payment_gateways: {
                          ...settings.payment_gateways,
                          stripe: { ...settings.payment_gateways.stripe, webhook_secret: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">PayPal</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment_gateways.paypal.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      payment_gateways: {
                        ...settings.payment_gateways,
                        paypal: { ...settings.payment_gateways.paypal, enabled: e.target.checked }
                      }
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>
              {settings.payment_gateways.paypal.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={settings.payment_gateways.paypal.client_id}
                      onChange={(e) => setSettings({
                        ...settings,
                        payment_gateways: {
                          ...settings.payment_gateways,
                          paypal: { ...settings.payment_gateways.paypal, client_id: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret
                    </label>
                    <input
                      type="password"
                      value={settings.payment_gateways.paypal.secret}
                      onChange={(e) => setSettings({
                        ...settings,
                        payment_gateways: {
                          ...settings.payment_gateways,
                          paypal: { ...settings.payment_gateways.paypal, secret: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode
                    </label>
                    <select
                      value={settings.payment_gateways.paypal.mode}
                      onChange={(e) => setSettings({
                        ...settings,
                        payment_gateways: {
                          ...settings.payment_gateways,
                          paypal: { ...settings.payment_gateways.paypal, mode: e.target.value as any }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Invoicing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={settings.invoicing.prefix}
                onChange={(e) => setSettings({
                  ...settings,
                  invoicing: { ...settings.invoicing, prefix: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starting Number
              </label>
              <input
                type="number"
                value={settings.invoicing.starting_number}
                onChange={(e) => setSettings({
                  ...settings,
                  invoicing: { ...settings.invoicing, starting_number: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Due (Days)
              </label>
              <input
                type="number"
                value={settings.invoicing.due_days}
                onChange={(e) => setSettings({
                  ...settings,
                  invoicing: { ...settings.invoicing, due_days: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Fee (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.invoicing.late_fee_percentage}
                onChange={(e) => setSettings({
                  ...settings,
                  invoicing: { ...settings.invoicing, late_fee_percentage: parseFloat(e.target.value) }
                })}
                disabled={!settings.invoicing.late_fee_enabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.invoicing.late_fee_enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    invoicing: { ...settings.invoicing, late_fee_enabled: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable Late Fees</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.invoicing.auto_send}
                  onChange={(e) => setSettings({
                    ...settings,
                    invoicing: { ...settings.invoicing, auto_send: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-send Invoices</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.invoicing.show_payment_link}
                  onChange={(e) => setSettings({
                    ...settings,
                    invoicing: { ...settings.invoicing, show_payment_link: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Payment Link</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Refund Policy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Approval Threshold ($)
              </label>
              <input
                type="number"
                value={settings.refunds.auto_approval_threshold}
                onChange={(e) => setSettings({
                  ...settings,
                  refunds: { ...settings.refunds, auto_approval_threshold: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Period (Days)
              </label>
              <input
                type="number"
                value={settings.refunds.refund_period_days}
                onChange={(e) => setSettings({
                  ...settings,
                  refunds: { ...settings.refunds, refund_period_days: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.refunds.allow_partial}
                onChange={(e) => setSettings({
                  ...settings,
                  refunds: { ...settings.refunds, allow_partial: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow Partial Refunds</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.refunds.processing_fee_refundable}
                onChange={(e) => setSettings({
                  ...settings,
                  refunds: { ...settings.refunds, processing_fee_refundable: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Refund Processing Fees</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
