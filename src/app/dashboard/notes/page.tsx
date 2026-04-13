import { StickyNote, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function NotesMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Notes',
      value: 3542,
      change: '+145 this week',
      changeType: 'increase',
      icon: FileText,
    },
    {
      title: 'Flagged Notes',
      value: 8,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Shared Notes',
      value: 892,
      change: '25.2% of total',
      changeType: 'neutral',
      icon: StickyNote,
    },
    {
      title: 'Created Today',
      value: 127,
      change: '+18% from yesterday',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Note ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
    },
    {
      key: 'user_id',
      label: 'Creator',
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'is_pinned',
      label: 'Pinned',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: value ? '#3B82F620' : '#6B728020',
            color: value ? '#3B82F6' : '#6B7280',
          }}
        >
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const charts = [
    {
      type: 'bar' as const,
      title: 'Note Creation Trends',
      data: [
        { name: 'Mon', value: 18 },
        { name: 'Tue', value: 22 },
        { name: 'Wed', value: 25 },
        { name: 'Thu', value: 28 },
        { name: 'Fri', value: 24 },
        { name: 'Sat', value: 8 },
        { name: 'Sun', value: 5 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Notes by Portal Type',
      data: [
        { name: 'Provider', value: 1845 },
        { name: 'Patient', value: 1123 },
        { name: 'Pharmacy', value: 574 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Notes Monitoring & Review"
      description="Monitor and moderate all user notes across portals"
      icon={StickyNote}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllNotes()}
      exportTableName="admin_user_notes"
      moderationTarget="user_notes"
      charts={charts}
    />
  );
}
