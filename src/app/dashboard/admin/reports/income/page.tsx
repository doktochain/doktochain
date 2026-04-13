import { useState, useEffect } from 'react';
import { TrendingUp, Download } from 'lucide-react';
import { FinanceService } from '../../../../../services/financeService';
import { ReportsService } from '../../../../../services/reportsService';
import ReportHeader from '../../../../../components/reports/ReportHeader';
import ReportCard from '../../../../../components/reports/ReportCard';
import ReportTable, { ReportTableColumn } from '../../../../../components/reports/ReportTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function IncomeReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [summary, setSummary] = useState<any>(null);
  const [incomeData, setIncomeData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const summaryData = await FinanceService.getIncomeSummary(
        dateRange.startDate,
        dateRange.endDate
      );
      setSummary(summaryData);

      const { data } = await FinanceService.getIncome(100, 0, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setIncomeData(data);
    } catch (error) {
      console.error('Error loading income data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Source', 'Description', 'User Type', 'Amount'];
    const rows = incomeData.map((item) => [
      new Date(item.income_date).toLocaleDateString(),
      item.income_source.replace(/_/g, ' '),
      item.description || '-',
      item.related_user_type || '-',
      `$${item.amount.toFixed(2)}`,
    ]);
    const blob = ReportsService.exportToCSV(headers, rows);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const chartData = summary
    ? Object.entries(summary.bySource).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: value,
      }))
    : [];

  const columns: ReportTableColumn[] = [
    {
      key: 'income_date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'income_source',
      label: 'Source',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => value || '-',
    },
    {
      key: 'related_user_type',
      label: 'User Type',
      render: (value) => value || '-',
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (value) => (
        <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Income Report"
        description="Track all revenue streams and income sources across the platform"
        icon={<TrendingUp className="w-8 h-8 text-green-600" />}
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
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportCard
              title="Total Income"
              value={summary ? formatCurrency(summary.totalIncome) : '$0.00'}
              icon={<TrendingUp className="w-6 h-6" />}
              color="green"
              subtitle="All revenue sources"
            />
            <ReportCard
              title="Provider Commission"
              value={summary ? formatCurrency(summary.bySource.provider_commission || 0) : '$0.00'}
              icon={<TrendingUp className="w-6 h-6" />}
              color="blue"
              subtitle="From provider services"
            />
            <ReportCard
              title="Pharmacy Commission"
              value={summary ? formatCurrency(summary.bySource.pharmacy_commission || 0) : '$0.00'}
              icon={<TrendingUp className="w-6 h-6" />}
              color="blue"
              subtitle="From pharmacy orders"
            />
            <ReportCard
              title="Subscriptions"
              value={summary ? formatCurrency(summary.bySource.subscription_fees || 0) : '$0.00'}
              icon={<TrendingUp className="w-6 h-6" />}
              color="yellow"
              subtitle="Recurring revenue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Income by Source</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(summary?.bySource || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Income Transactions</h3>
            <ReportTable
              columns={columns}
              data={incomeData}
              loading={loading}
              emptyMessage="No income records found for the selected period"
            />
          </div>
        </>
      )}
    </div>
  );
}
