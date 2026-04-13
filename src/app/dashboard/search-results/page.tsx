import { Search, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function SearchAnalyticsPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Searches',
      value: 8934,
      change: '+15% this week',
      changeType: 'increase',
      icon: Search,
    },
    {
      title: 'Failed Searches',
      value: 245,
      change: '2.7% of total',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Avg Results Clicked',
      value: 2.4,
      change: '+0.3 from last week',
      changeType: 'increase',
      icon: TrendingUp,
    },
    {
      title: 'Popular Searches',
      value: 156,
      change: 'Unique queries',
      changeType: 'neutral',
      icon: BarChart3,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Search ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'search_query',
      label: 'Query',
      sortable: true,
    },
    {
      key: 'user_role',
      label: 'User Portal',
      render: (value) => (
        <span className="capitalize">{value || 'Anonymous'}</span>
      ),
    },
    {
      key: 'result_count',
      label: 'Results',
      sortable: true,
    },
    {
      key: 'results_clicked',
      label: 'Clicks',
      sortable: true,
    },
    {
      key: 'is_successful',
      label: 'Successful',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: value ? '#10B98120' : '#EF444420',
            color: value ? '#10B981' : '#EF4444',
          }}
        >
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  const charts = [
    {
      type: 'bar' as const,
      title: 'Search Volume (Last 7 Days)',
      data: [
        { name: 'Mon', value: 1245 },
        { name: 'Tue', value: 1356 },
        { name: 'Wed', value: 1289 },
        { name: 'Thu', value: 1478 },
        { name: 'Fri', value: 1390 },
        { name: 'Sat', value: 845 },
        { name: 'Sun', value: 756 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Searches by Portal Type',
      data: [
        { name: 'Patient', value: 4234 },
        { name: 'Provider', value: 3145 },
        { name: 'Pharmacy', value: 1555 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Search Analytics & Insights"
      description="Monitor search activity and analyze user search patterns"
      icon={Search}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getSearchAnalytics()}
      exportTableName="admin_search_analytics"
      moderationTarget="search_queries"
      charts={charts}
    />
  );
}
