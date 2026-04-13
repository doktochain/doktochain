import { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { FinanceService } from '../../../../../services/financeService';
import { ReportsService } from '../../../../../services/reportsService';
import ReportHeader from '../../../../../components/reports/ReportHeader';
import ReportCard from '../../../../../components/reports/ReportCard';
import ReportTable, { ReportTableColumn } from '../../../../../components/reports/ReportTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function ExpensesReportPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [summary, setSummary] = useState<any>(null);
  const [expensesData, setExpensesData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const summaryData = await FinanceService.getExpenseSummary(
        dateRange.startDate,
        dateRange.endDate
      );
      setSummary(summaryData);

      const { data } = await FinanceService.getExpenses(100, 0, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setExpensesData(data);
    } catch (error) {
      console.error('Error loading expenses data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Status'];
    const rows = expensesData.map((item) => [
      new Date(item.expense_date).toLocaleDateString(),
      item.expense_category.replace(/_/g, ' '),
      item.description,
      item.vendor_name || '-',
      `$${item.amount.toFixed(2)}`,
      item.status,
    ]);
    const blob = ReportsService.exportToCSV(headers, rows);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const chartData = summary
    ? Object.entries(summary.byCategory).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: value,
      }))
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const columns: ReportTableColumn[] = [
    {
      key: 'expense_date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'expense_category',
      label: 'Category',
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
    },
    {
      key: 'vendor_name',
      label: 'Vendor',
      render: (value) => value || '-',
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (value) => (
        <span className="font-semibold text-red-600">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Expenses Report"
        description="Monitor operational costs and expense trends across the platform"
        icon={<Receipt className="w-8 h-8 text-red-600" />}
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
              title="Total Expenses"
              value={summary ? formatCurrency(summary.totalExpenses) : '$0.00'}
              icon={<Receipt className="w-6 h-6" />}
              color="red"
              subtitle="All operational costs"
            />
            <ReportCard
              title="Approved Expenses"
              value={summary ? formatCurrency(summary.approvedExpenses) : '$0.00'}
              icon={<Receipt className="w-6 h-6" />}
              color="green"
              subtitle="Approved and paid"
            />
            <ReportCard
              title="Pending Approval"
              value={summary ? formatCurrency(summary.pendingExpenses) : '$0.00'}
              icon={<Receipt className="w-6 h-6" />}
              color="yellow"
              subtitle="Awaiting approval"
            />
            <ReportCard
              title="Expense Categories"
              value={summary ? Object.keys(summary.byCategory).length : 0}
              icon={<Receipt className="w-6 h-6" />}
              color="blue"
              subtitle="Active categories"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(summary?.byCategory || {}).map(([key, value]: [string, any]) => {
                  const percentage = summary.totalExpenses > 0
                    ? ((value / summary.totalExpenses) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(value)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{percentage}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Expense Transactions</h3>
            <ReportTable
              columns={columns}
              data={expensesData}
              loading={loading}
              emptyMessage="No expense records found for the selected period"
            />
          </div>
        </>
      )}
    </div>
  );
}
