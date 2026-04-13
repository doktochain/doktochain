import { useEffect, useState } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext';
import StatCard from '../../../../../components/ui/StatCard';
import {
  getDashboardAnalytics,
  getLatestAnalytics,
  getRevenueByPeriod,
} from '../../../../../services/dashboardAnalyticsService';
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  UserPlus,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const { currentColors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const endDate = new Date().toISOString().split('T')[0];
      let startDate = new Date();

      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const latest = await getLatestAnalytics();
      const historicalData = await getDashboardAnalytics(
        startDate.toISOString().split('T')[0],
        endDate
      );
      const revenue = await getRevenueByPeriod();

      setAnalytics(latest);
      setRevenueData(revenue || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: currentColors.primary }}
            />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive view of platform performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics?.total_revenue || 0)}
          change="+12.5%"
          changeType="increase"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/20"
          subtitle="vs last period"
        />

        <StatCard
          title="Total Users"
          value={formatNumber(analytics?.total_users || 0)}
          change="+8.2%"
          changeType="increase"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          subtitle="registered users"
        />

        <StatCard
          title="Active Users"
          value={formatNumber(analytics?.active_users || 0)}
          change="+15.3%"
          changeType="increase"
          icon={Activity}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          subtitle="in selected period"
        />

        <StatCard
          title="Conversion Rate"
          value={`${analytics?.conversion_rate || 0}%`}
          change="-2.1%"
          changeType="decrease"
          icon={TrendingUp}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100 dark:bg-orange-900/20"
          subtitle="visitor to user"
        />

        <StatCard
          title="Total Appointments"
          value={formatNumber(analytics?.total_appointments || 0)}
          change="+23.4%"
          changeType="increase"
          icon={Activity}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-100 dark:bg-teal-900/20"
          subtitle="completed appointments"
        />

        <StatCard
          title="Healthcare Providers"
          value={formatNumber(analytics?.total_providers || 0)}
          change="+5.7%"
          changeType="increase"
          icon={UserPlus}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          subtitle="active providers"
        />

        <StatCard
          title="Avg Session Duration"
          value={formatDuration(analytics?.avg_session_duration || 0)}
          change="+4.2%"
          changeType="increase"
          icon={Clock}
          iconColor="text-pink-600"
          iconBgColor="bg-pink-100 dark:bg-pink-900/20"
          subtitle="per user session"
        />

        <StatCard
          title="Platform Growth"
          value="+18.9%"
          change="YoY growth"
          changeType="increase"
          icon={ArrowUp}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/20"
          subtitle="year over year"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Area
                type="monotone"
                dataKey="total_revenue"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_users"
                stroke="#10b981"
                strokeWidth={2}
                name="Total Users"
              />
              <Line
                type="monotone"
                dataKey="active_users"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Active Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Appointments Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="total_appointments" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Key Performance Indicators
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">User Engagement</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Daily active users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(analytics?.active_users || 0)}
                </p>
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <ArrowUp className="w-4 h-4" />
                  12.5%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Revenue per User</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average revenue</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(
                    analytics?.total_revenue && analytics?.total_users
                      ? analytics.total_revenue / analytics.total_users
                      : 0
                  )}
                </p>
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <ArrowUp className="w-4 h-4" />
                  8.3%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Platform Health</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">System uptime</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">99.9%</p>
                <p className="text-sm text-green-600">Operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
