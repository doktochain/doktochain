import { Mail, MailOpen, MailWarning, TrendingUp, AlertCircle } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EmailMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Emails (24h)',
      value: 1456,
      change: '+8% from yesterday',
      changeType: 'increase',
      icon: Mail,
    },
    {
      title: 'Flagged Emails',
      value: 7,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Open Rate',
      value: '78.5%',
      change: '+3.2% this week',
      changeType: 'increase',
      icon: MailOpen,
    },
    {
      title: 'Bounced Emails',
      value: 23,
      change: 'Down 5 from yesterday',
      changeType: 'neutral',
      icon: MailWarning,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Email ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
    },
    {
      key: 'sender_id',
      label: 'Sender',
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'folder',
      label: 'Folder',
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'is_read',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize"
          style={{
            backgroundColor: value ? '#10B98120' : '#3B82F620',
            color: value ? '#10B981' : '#3B82F6',
          }}
        >
          {value ? 'Read' : 'Unread'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  const charts = [
    {
      type: 'line' as const,
      title: 'Email Volume (Last 7 Days)',
      data: [
        { name: 'Mon', value: 205 },
        { name: 'Tue', value: 198 },
        { name: 'Wed', value: 215 },
        { name: 'Thu', value: 228 },
        { name: 'Fri', value: 210 },
        { name: 'Sat', value: 145 },
        { name: 'Sun', value: 132 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Emails by Type',
      data: [
        { name: 'Appointment Confirmations', value: 456 },
        { name: 'Notifications', value: 342 },
        { name: 'Reports', value: 234 },
        { name: 'Other', value: 424 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Email Monitoring & Compliance"
      description="Monitor all email communications and ensure compliance"
      icon={Mail}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllEmails()}
      exportTableName="admin_email_monitoring"
      moderationTarget="email_logs"
      charts={charts}
    />
  );
}
