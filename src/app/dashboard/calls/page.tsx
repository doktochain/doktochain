import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Video, AlertCircle } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function CallMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Calls (24h)',
      value: 342,
      change: '+18% from yesterday',
      changeType: 'increase',
      icon: Phone,
    },
    {
      title: 'Flagged Calls',
      value: 3,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Active Calls',
      value: 12,
      change: 'Real-time',
      changeType: 'neutral',
      icon: PhoneCall,
    },
    {
      title: 'Avg Duration',
      value: '18m 34s',
      change: '+2m from last week',
      changeType: 'increase',
      icon: Video,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Call ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'patient',
      label: 'Participants',
      render: (value, row) => (
        <div>
          <p className="font-medium">{row.patient?.first_name} {row.patient?.last_name}</p>
          <p className="text-sm" style={{ color: currentColors.textSecondary }}>
            with {row.provider?.first_name} {row.provider?.last_name}
          </p>
        </div>
      ),
    },
    {
      key: 'appointment_type',
      label: 'Type',
      render: (value) => (
        <span className="capitalize">{value || 'telemedicine'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: value === 'completed' ? '#10B98120' : '#F59E0B20',
            color: value === 'completed' ? '#10B981' : '#F59E0B',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'appointment_date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const charts = [
    {
      type: 'line' as const,
      title: 'Call Volume (Last 7 Days)',
      data: [
        { name: 'Mon', value: 45 },
        { name: 'Tue', value: 52 },
        { name: 'Wed', value: 49 },
        { name: 'Thu', value: 63 },
        { name: 'Fri', value: 58 },
        { name: 'Sat', value: 35 },
        { name: 'Sun', value: 40 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Calls by Portal Type',
      data: [
        { name: 'Patient-Provider', value: 245 },
        { name: 'Provider-Provider', value: 67 },
        { name: 'Emergency', value: 30 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Call Monitoring System"
      description="Monitor and analyze all voice and video calls across the platform"
      icon={Phone}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllCalls()}
      exportTableName="appointments"
      moderationTarget="call_sessions"
      charts={charts}
    />
  );
}
