import { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Plus,
  X,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Banknote,
  Building2,
  Calendar,
} from 'lucide-react';
import { FinanceService, ProviderSettlement, ProviderUnsettledBalance } from '../../../../../services/financeService';
import { useAuth } from '../../../../../contexts/AuthContext';

export default function AdminSettlementsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [unsettledBalances, setUnsettledBalances] = useState<ProviderUnsettledBalance[]>([]);
  const [settlements, setSettlements] = useState<ProviderSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderUnsettledBalance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'queue') {
        const balances = await FinanceService.getProviderUnsettledBalances();
        setUnsettledBalances(balances);
      } else {
        const { data } = await FinanceService.getSettlements(50, 0);
        setSettlements(data);
      }
    } catch (err) {
      console.error('Failed to load settlement data:', err);
    }
    setLoading(false);
  };

  const handleOpenSettle = (provider: ProviderUnsettledBalance) => {
    setSelectedProvider(provider);
    setShowSettleModal(true);
  };

  const handleSettlementCreated = () => {
    setShowSettleModal(false);
    setSelectedProvider(null);
    loadData();
  };

  const filteredBalances = unsettledBalances.filter(
    (b) =>
      (b.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSettlements = settlements.filter(
    (s) =>
      (s.provider as any)?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.provider as any)?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnsettled = unsettledBalances.reduce((sum, b) => sum + Math.max(0, b.unsettled_cents), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Provider Settlements</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage provider payouts and settlement history
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Unsettled</span>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${(totalUnsettled / 100).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Across {unsettledBalances.filter((b) => b.unsettled_cents > 0).length} providers
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Providers Pending</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {unsettledBalances.filter((b) => b.unsettled_cents > 0).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Awaiting settlement</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Settled</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{settlements.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All-time settlements</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === 'queue'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Settlement Queue
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Settlement History
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search providers..."
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'queue' ? (
          <SettlementQueue
            balances={filteredBalances}
            onSettle={handleOpenSettle}
          />
        ) : (
          <SettlementHistory settlements={filteredSettlements} />
        )}
      </div>

      {showSettleModal && selectedProvider && user && (
        <RecordSettlementModal
          provider={selectedProvider}
          adminId={user.id}
          onClose={() => {
            setShowSettleModal(false);
            setSelectedProvider(null);
          }}
          onSuccess={handleSettlementCreated}
        />
      )}
    </div>
  );
}

function SettlementQueue({
  balances,
  onSettle,
}: {
  balances: ProviderUnsettledBalance[];
  onSettle: (provider: ProviderUnsettledBalance) => void;
}) {
  if (balances.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All Settled</h3>
        <p className="text-gray-600 dark:text-gray-400">No providers have unsettled balances</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Provider
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Total Earned
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Total Settled
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Unsettled Balance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Last Settlement
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {balances.map((balance) => (
            <tr key={balance.provider_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {balance.business_name || balance.full_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{balance.email}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                ${(balance.total_earned_cents / 100).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                ${(balance.total_settled_cents / 100).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-right">
                <span className={`font-semibold ${balance.unsettled_cents > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  ${(Math.max(0, balance.unsettled_cents) / 100).toFixed(2)}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                {balance.last_settlement_date
                  ? new Date(balance.last_settlement_date).toLocaleDateString()
                  : 'Never'}
              </td>
              <td className="px-6 py-4 text-right">
                {balance.unsettled_cents > 0 && (
                  <button
                    onClick={() => onSettle(balance)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                  >
                    <Banknote className="w-4 h-4" />
                    Settle
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettlementHistory({ settlements }: { settlements: ProviderSettlement[] }) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-16">
        <ArrowUpDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Settlements</h3>
        <p className="text-gray-600 dark:text-gray-400">No settlement records found</p>
      </div>
    );
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'e-transfer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cheque':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'wire':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Period
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Gross
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Commission
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Net Paid
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Method
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Reference
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {settlements.map((s) => {
            const prov = s.provider as any;
            return (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {prov?.business_name || prov?.user_profiles?.full_name || 'Unknown'}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {s.period_start && s.period_end
                    ? `${new Date(s.period_start).toLocaleDateString()} - ${new Date(s.period_end).toLocaleDateString()}`
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  ${(s.amount_cents / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-red-600">
                  -${(s.commission_cents / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  ${(s.net_paid_cents / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMethodBadge(s.payment_method)}`}>
                    {s.payment_method}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {s.reference_number || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(s.settled_at).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecordSettlementModal({
  provider,
  adminId,
  onClose,
  onSuccess,
}: {
  provider: ProviderUnsettledBalance;
  adminId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const defaultCommissionRate = 10;
  const grossAmount = Math.max(0, provider.unsettled_cents);
  const defaultCommission = Math.round(grossAmount * (defaultCommissionRate / 100));

  const [form, setForm] = useState({
    amount_cents: grossAmount,
    commission_cents: defaultCommission,
    payment_method: 'e-transfer',
    reference_number: '',
    notes: '',
    period_start: '',
    period_end: new Date().toISOString().split('T')[0],
  });

  const netPaid = form.amount_cents - form.commission_cents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.reference_number.trim()) {
      setError('Reference number is required');
      return;
    }
    if (!form.period_start || !form.period_end) {
      setError('Settlement period dates are required');
      return;
    }
    if (netPaid <= 0) {
      setError('Net paid amount must be positive');
      return;
    }

    setSaving(true);
    try {
      await FinanceService.createSettlement({
        provider_id: provider.provider_id,
        amount_cents: form.amount_cents,
        commission_cents: form.commission_cents,
        net_paid_cents: netPaid,
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        notes: form.notes,
        settled_by: adminId,
        period_start: form.period_start,
        period_end: form.period_end,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Settlement</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {provider.business_name || provider.full_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Unsettled Balance: ${(grossAmount / 100).toFixed(2)} CAD
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gross Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={(form.amount_cents / 100).toFixed(2)}
                onChange={(e) =>
                  setForm({ ...form, amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Commission ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={(form.commission_cents / 100).toFixed(2)}
                onChange={(e) =>
                  setForm({ ...form, commission_cents: Math.round(parseFloat(e.target.value || '0') * 100) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Amount to Pay</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ${(netPaid / 100).toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="e-transfer">E-Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="wire">Wire Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference Number *
            </label>
            <input
              type="text"
              value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              placeholder="e.g., E-TRF-2026-001"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period Start *
              </label>
              <input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period End *
              </label>
              <input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Any additional details..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Processing...' : 'Record Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
