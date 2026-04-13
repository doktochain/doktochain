import { useEffect, useState } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import StatCard from '../../../../../components/ui/StatCard';
import {
  getSalesMetrics,
  getLatestSalesMetrics,
} from '../../../../../services/dashboardAnalyticsService';
import {
  ShoppingCart,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  BarChart3,
  ArrowUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SalesPage() {
  const { currentColors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const [historicalSales, setHistoricalSales] = useState<any[]>([]);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    loadSalesData();
  }, [periodType]);

  const loadSalesData = async () => {
    try {
      setLoading(true);

      const latest = await getLatestSalesMetrics(periodType);
      const historical = await getSalesMetrics(periodType);

      setSalesData(latest);
      setHistoricalSales(historical || []);
    } catch (error) {
      console.error('Failed to load sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-CA').format(value);
  };

  const topProducts = [
    { name: 'Video Consultations', sales: 45000, growth: 23.5 },
    { name: 'In-Person Appointments', sales: 38000, growth: 18.2 },
    { name: 'Prescription Services', sales: 29000, growth: 15.8 },
    { name: 'Lab Tests', sales: 22000, growth: 12.4 },
    { name: 'Specialized Treatments', sales: 18000, growth: 9.7 },
  ];

  const salesByRegion = [
    { region: 'Ontario', value: 45000 },
    { region: 'Quebec', value: 32000 },
    { region: 'British Columbia', value: 28000 },
    { region: 'Alberta', value: 21000 },
    { region: 'Other', value: 14000 },
  ];

  const conversionFunnel = [
    { stage: 'Visitors', count: 50000, percentage: 100 },
    { stage: 'Sign Ups', count: 15000, percentage: 30 },
    { stage: 'Appointments Booked', count: 8500, percentage: 17 },
    { stage: 'Consultations Completed', count: 7200, percentage: 14.4 },
    { stage: 'Repeat Customers', count: 4300, percentage: 8.6 },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: currentColors.primary }}
            />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sales data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive sales analytics and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodType(period)}
              className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                periodType === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={formatCurrency(salesData?.total_sales || 0)}
          change="+24.5%"
          changeType="increase"
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          subtitle="vs last period"
        />

        <StatCard
          title="Average Order Value"
          value={formatCurrency(salesData?.average_order_value || 0)}
          change="+8.3%"
          changeType="increase"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/20"
          subtitle="per transaction"
        />

        <StatCard
          title="Conversion Rate"
          value={`${salesData?.conversion_rate || 0}%`}
          change="+3.2%"
          changeType="increase"
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          subtitle="visitor to customer"
        />

        <StatCard
          title="Total Transactions"
          value={formatNumber(salesData?.total_transactions || 0)}
          change="+19.7%"
          changeType="increase"
          icon={BarChart3}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100 dark:bg-orange-900/20"
          subtitle="completed sales"
        />

        <StatCard
          title="New Customers"
          value={formatNumber(salesData?.new_customers || 0)}
          change="+15.4%"
          changeType="increase"
          icon={Users}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-100 dark:bg-teal-900/20"
          subtitle="first-time buyers"
        />

        <StatCard
          title="Returning Customers"
          value={formatNumber(salesData?.returning_customers || 0)}
          change="+12.8%"
          changeType="increase"
          icon={Award}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          subtitle="repeat purchases"
        />

        <StatCard
          title="Customer Acquisition Cost"
          value={formatCurrency(salesData?.customer_acquisition_cost || 0)}
          change="-5.2%"
          changeType="decrease"
          icon={Target}
          iconColor="text-pink-600"
          iconBgColor="bg-pink-100 dark:bg-pink-900/20"
          subtitle="CAC optimization"
        />

        <StatCard
          title="Customer Lifetime Value"
          value={formatCurrency(salesData?.customer_lifetime_value || 0)}
          change="+21.3%"
          changeType="increase"
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/20"
          subtitle="avg LTV"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sales Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalSales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="period_start"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-CA', { month: 'short' })}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-CA')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_sales"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Total Sales"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sales by Region
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesByRegion}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.region}: ${formatCurrency(entry.value)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {salesByRegion.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Top Performing Services
          </h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(product.sales)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUp className="w-4 h-4" />
                    <span className="font-semibold">{product.growth}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(product.sales / topProducts[0].sales) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Conversion Funnel
          </h3>
          <div className="space-y-3">
            {conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stage.stage}
                  </span>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {formatNumber(stage.count)} ({stage.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                  <div
                    className="h-8 rounded-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all"
                    style={{
                      width: `${stage.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  >
                    {stage.percentage >= 15 && `${stage.percentage}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Overall Conversion: </span>
              {conversionFunnel[conversionFunnel.length - 1].percentage}% of visitors become
              repeat customers
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Customer Metrics Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={historicalSales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="period_start"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-CA', { month: 'short' })}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-CA')}
              />
              <Legend />
              <Bar dataKey="new_customers" fill="#3b82f6" radius={[8, 8, 0, 0]} name="New Customers" />
              <Bar dataKey="returning_customers" fill="#10b981" radius={[8, 8, 0, 0]} name="Returning Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Key Sales Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h4 className="font-semibold text-gray-900 dark:text-white">Revenue Growth</h4>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-1">+24.5%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Highest growth rate in Q4. Video consultations driving majority of increase.
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-green-600" />
              <h4 className="font-semibold text-gray-900 dark:text-white">Customer Retention</h4>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-1">87.3%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Excellent retention rate. Focus on maintaining service quality.
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-blue-600" />
              <h4 className="font-semibold text-gray-900 dark:text-white">Market Opportunity</h4>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-1">$2.4M</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Untapped market potential in underserved regions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
