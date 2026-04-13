import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { ReportsService } from '../../../../../services/reportsService';
import ReportHeader from '../../../../../components/reports/ReportHeader';
import ReportCard from '../../../../../components/reports/ReportCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProfitLossReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [profitLoss, setProfitLoss] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ReportsService.getProfitLossStatement({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setProfitLoss(data);
    } catch (error) {
      console.error('Error loading P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!profitLoss) return;

    const headers = ['Category', 'Amount'];
    const rows = [
      ['REVENUE', ''],
      ['Provider Commission', `$${profitLoss.revenue.providerCommission.toFixed(2)}`],
      ['Pharmacy Commission', `$${profitLoss.revenue.pharmacyCommission.toFixed(2)}`],
      ['Subscription Fees', `$${profitLoss.revenue.subscriptionFees.toFixed(2)}`],
      ['Premium Features', `$${profitLoss.revenue.premiumFeatures.toFixed(2)}`],
      ['Other Revenue', `$${profitLoss.revenue.other.toFixed(2)}`],
      ['Total Revenue', `$${profitLoss.revenue.total.toFixed(2)}`],
      ['', ''],
      ['EXPENSES', ''],
      ['Server Costs', `$${profitLoss.expenses.server.toFixed(2)}`],
      ['Marketing', `$${profitLoss.expenses.marketing.toFixed(2)}`],
      ['Staff Salaries', `$${profitLoss.expenses.staffSalaries.toFixed(2)}`],
      ['Third Party Services', `$${profitLoss.expenses.thirdPartyServices.toFixed(2)}`],
      ['Operational', `$${profitLoss.expenses.operational.toFixed(2)}`],
      ['Other Expenses', `$${profitLoss.expenses.other.toFixed(2)}`],
      ['Total Expenses', `$${profitLoss.expenses.total.toFixed(2)}`],
      ['', ''],
      ['PROFIT', ''],
      ['Gross Profit', `$${profitLoss.grossProfit.toFixed(2)}`],
      ['Gross Profit Margin', `${profitLoss.grossProfitMargin.toFixed(2)}%`],
      ['Net Income', `$${profitLoss.netIncome.toFixed(2)}`],
      ['Net Profit Margin', `$${profitLoss.netProfitMargin.toFixed(2)}%`],
    ];
    const blob = ReportsService.exportToCSV(headers, rows);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const chartData = profitLoss
    ? [
        {
          name: 'Revenue',
          amount: profitLoss.revenue.total,
        },
        {
          name: 'Expenses',
          amount: profitLoss.expenses.total,
        },
        {
          name: 'Net Income',
          amount: profitLoss.netIncome,
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Profit & Loss Statement"
        description="Comprehensive financial performance overview with revenue, expenses, and profitability metrics"
        icon={<BarChart3 className="w-8 h-8 text-blue-600" />}
        onExport={handleExport}
        onRefresh={loadData}
        showDateRange
        dateRangeStart={dateRange.startDate}
        dateRangeEnd={dateRange.endDate}
        onDateRangeChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : profitLoss ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportCard
              title="Total Revenue"
              value={formatCurrency(profitLoss.revenue.total)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="green"
              subtitle="All income sources"
            />
            <ReportCard
              title="Total Expenses"
              value={formatCurrency(profitLoss.expenses.total)}
              icon={<TrendingDown className="w-6 h-6" />}
              color="red"
              subtitle="All operational costs"
            />
            <ReportCard
              title="Net Income"
              value={formatCurrency(profitLoss.netIncome)}
              icon={profitLoss.netIncome >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              color={profitLoss.netIncome >= 0 ? 'green' : 'red'}
              subtitle={profitLoss.netIncome >= 0 ? 'Profitable' : 'Loss'}
            />
            <ReportCard
              title="Profit Margin"
              value={`${profitLoss.netProfitMargin.toFixed(2)}%`}
              icon={<BarChart3 className="w-6 h-6" />}
              color="blue"
              subtitle="Net margin"
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                <h3 className="text-lg font-semibold text-green-900">Revenue</h3>
              </div>
              <div className="p-6 space-y-3">
                {Object.entries({
                  'Provider Commission': profitLoss.revenue.providerCommission,
                  'Pharmacy Commission': profitLoss.revenue.pharmacyCommission,
                  'Subscription Fees': profitLoss.revenue.subscriptionFees,
                  'Premium Features': profitLoss.revenue.premiumFeatures,
                  'Other': profitLoss.revenue.other,
                }).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-700">{key}</span>
                    <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 pt-4 border-t-2 border-gray-300">
                  <span className="font-bold text-gray-900">Total Revenue</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(profitLoss.revenue.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                <h3 className="text-lg font-semibold text-red-900">Expenses</h3>
              </div>
              <div className="p-6 space-y-3">
                {Object.entries({
                  'Server Costs': profitLoss.expenses.server,
                  'Marketing': profitLoss.expenses.marketing,
                  'Staff Salaries': profitLoss.expenses.staffSalaries,
                  'Third Party Services': profitLoss.expenses.thirdPartyServices,
                  'Operational': profitLoss.expenses.operational,
                  'Other': profitLoss.expenses.other,
                }).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-700">{key}</span>
                    <span className="font-semibold text-red-600">{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 pt-4 border-t-2 border-gray-300">
                  <span className="font-bold text-gray-900">Total Expenses</span>
                  <span className="font-bold text-red-600 text-lg">{formatCurrency(profitLoss.expenses.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-700">Gross Profit</span>
                  <span className={`font-bold ${profitLoss.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitLoss.grossProfit)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-700">Gross Profit Margin</span>
                  <span className="font-semibold text-gray-900">{profitLoss.grossProfitMargin.toFixed(2)}%</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-700">Net Income</span>
                  <span className={`font-bold ${profitLoss.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitLoss.netIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-700">Net Profit Margin</span>
                  <span className="font-semibold text-gray-900">{profitLoss.netProfitMargin.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">No data available</div>
      )}
    </div>
  );
}
