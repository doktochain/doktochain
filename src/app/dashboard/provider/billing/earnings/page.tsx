import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Download, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { providerBillingService } from '../../../../../services/providerBillingService';
import { FinanceService, ProviderSettlement } from '../../../../../services/financeService';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';

export default function EarningsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    averageTransaction: 0,
    byMethod: {} as Record<string, number>,
  });
  const [unsettledBalance, setUnsettledBalance] = useState(0);
  const [settlements, setSettlements] = useState<ProviderSettlement[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProviderId();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, period, providerId]);

  const loadProviderId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setProviderId(data.id);
  };

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    const [revenueData, payoutsData] = await Promise.all([
      providerBillingService.getRevenueStats(user.id, period),
      providerBillingService.getPayouts(user.id, { status: 'completed' }),
    ]);

    if (revenueData.data) {
      const revenue = revenueData.data
        .filter((t: any) => t.transaction_type === 'payment')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const payments = revenueData.data.filter((t: any) => t.transaction_type === 'payment');

      const byMethod: Record<string, number> = {};
      payments.forEach((t: any) => {
        const method = t.payment_method || 'Unknown';
        byMethod[method] = (byMethod[method] || 0) + Number(t.amount);
      });

      setStats({
        totalRevenue: revenue,
        totalPayments: payments.length,
        averageTransaction: payments.length > 0 ? revenue / payments.length : 0,
        byMethod,
      });
    }

    if (payoutsData.data) {
      setPayouts(payoutsData.data);
    }

    if (providerId) {
      try {
        const settlementHistory = await FinanceService.getProviderSettlementHistory(providerId);
        setSettlements(settlementHistory);

        const totalEarnedCents = Math.round(stats.totalRevenue * 100);
        const totalSettledCents = settlementHistory.reduce(
          (sum, s) => sum + Number(s.net_paid_cents), 0
        );
        setUnsettledBalance(Math.max(0, totalEarnedCents - totalSettledCents));
      } catch {
        setSettlements([]);
      }
    }

    setLoading(false);
  };

  const handleExport = () => {
    const csvRows = [
      ['Date', 'Type', 'Amount', 'Method', 'Status'].join(','),
    ];

    settlements.forEach((s) => {
      csvRows.push(
        [
          new Date(s.settled_at).toLocaleDateString(),
          'Settlement',
          (s.net_paid_cents / 100).toFixed(2),
          s.payment_method,
          s.status,
        ].join(',')
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Earnings</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your revenue and payouts</p>
        </div>

        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Total Revenue</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${stats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {stats.totalPayments} payments
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Average Transaction</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${stats.averageTransaction.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Per payment</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Unsettled Balance</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                ${(unsettledBalance / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Awaiting payout</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Payment Methods</span>
                <CreditCard className="w-5 h-5 text-teal-600" />
              </div>
              <div className="space-y-2">
                {Object.entries(stats.byMethod).slice(0, 3).map(([method, amount]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{method}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${Number(amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                {Object.keys(stats.byMethod).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data</p>
                )}
              </div>
            </div>
          </div>

          {settlements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settlement History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Date
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {settlements.map((s) => (
                      <tr key={s.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(s.settled_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {s.period_start && s.period_end
                            ? `${new Date(s.period_start).toLocaleDateString()} - ${new Date(s.period_end).toLocaleDateString()}`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          ${(s.amount_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                          -${(s.commission_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                          ${(s.net_paid_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {s.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {s.reference_number || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Payouts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Gateway
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Gross Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Net Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No payouts recorded yet
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(payout.scheduled_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {payout.gateway_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          ${payout.amount_gross}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                          -${payout.processing_fees}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                          ${payout.amount_net}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {payout.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
