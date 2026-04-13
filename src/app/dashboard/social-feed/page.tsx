import { Share2, ThumbsUp, MessageCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function SocialFeedModerationPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Posts',
      value: 4523,
      change: '+287 this week',
      changeType: 'increase',
      icon: Share2,
    },
    {
      title: 'Flagged Posts',
      value: 15,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertTriangle,
    },
    {
      title: 'Total Engagement',
      value: '12.5K',
      change: '+8.3% this week',
      changeType: 'increase',
      icon: ThumbsUp,
    },
    {
      title: 'Comments',
      value: 8934,
      change: '+412 today',
      changeType: 'increase',
      icon: MessageCircle,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Post ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'author_role',
      label: 'Author Portal',
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'content',
      label: 'Content Preview',
      render: (value) => (
        <span className="truncate max-w-xs block">
          {value?.substring(0, 50)}...
        </span>
      ),
    },
    {
      key: 'like_count',
      label: 'Likes',
      sortable: true,
    },
    {
      key: 'comment_count',
      label: 'Comments',
      sortable: true,
    },
    {
      key: 'moderation_status',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize"
          style={{
            backgroundColor: value === 'approved' ? '#10B98120' : value === 'pending' ? '#F59E0B20' : '#EF444420',
            color: value === 'approved' ? '#10B981' : value === 'pending' ? '#F59E0B' : '#EF4444',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Posted',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const charts = [
    {
      type: 'line' as const,
      title: 'Post Activity (Last 7 Days)',
      data: [
        { name: 'Mon', value: 38 },
        { name: 'Tue', value: 42 },
        { name: 'Wed', value: 45 },
        { name: 'Thu', value: 48 },
        { name: 'Fri', value: 52 },
        { name: 'Sat', value: 32 },
        { name: 'Sun', value: 30 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Posts by Portal Type',
      data: [
        { name: 'Provider', value: 2145 },
        { name: 'Patient', value: 1823 },
        { name: 'Pharmacy', value: 555 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Social Feed Moderation"
      description="Monitor and moderate all social posts and interactions"
      icon={Share2}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllPosts()}
      exportTableName="admin_social_feed"
      moderationTarget="social_posts"
      charts={charts}
    />
  );
}
