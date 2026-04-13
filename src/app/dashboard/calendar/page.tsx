import { Calendar, CalendarDays, Clock, Users, AlertCircle } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function CalendarMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Events (Today)',
      value: 127,
      change: '+12% from yesterday',
      changeType: 'increase',
      icon: Calendar,
    },
    {
      title: 'Flagged Events',
      value: 2,
      change: 'Requires attention',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Active Events',
      value: 8,
      change: 'Happening now',
      changeType: 'neutral',
      icon: Clock,
    },
    {
      title: 'Total Participants',
      value: 342,
      change: 'Across all events',
      changeType: 'neutral',
      icon: Users,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Appointment ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'reason_for_visit',
      label: 'Reason',
      sortable: true,
    },
    {
      key: 'appointment_type',
      label: 'Type',
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'appointment_date',
      label: 'Date & Time',
      sortable: true,
      render: (value, row: any) => {
        const date = new Date(value);
        const time = row.start_time || '';
        return `${date.toLocaleDateString()} ${time}`;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize"
          style={{
            backgroundColor: value === 'completed' ? '#10B98120' : '#3B82F620',
            color: value === 'completed' ? '#10B981' : '#3B82F6',
          }}
        >
          {value}
        </span>
      ),
    },
  ];

  const charts = [
    {
      type: 'bar' as const,
      title: 'Events by Day',
      data: [
        { name: 'Mon', value: 18 },
        { name: 'Tue', value: 22 },
        { name: 'Wed', value: 19 },
        { name: 'Thu', value: 25 },
        { name: 'Fri', value: 21 },
        { name: 'Sat', value: 12 },
        { name: 'Sun', value: 10 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Events by Type',
      data: [
        { name: 'Appointments', value: 145 },
        { name: 'Meetings', value: 67 },
        { name: 'Consultations', value: 88 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Calendar Management & Oversight"
      description="Monitor all scheduled events and appointments system-wide"
      icon={Calendar}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllSystemEvents()}
      exportTableName="admin_system_events"
      moderationTarget="system_events"
      charts={charts}
    />
  );
}
