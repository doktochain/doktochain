import { Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function ContactsMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Contacts',
      value: 2847,
      change: '+156 this week',
      changeType: 'increase',
      icon: Users,
    },
    {
      title: 'Flagged Contacts',
      value: 12,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Active Relationships',
      value: 1934,
      change: '68% of total',
      changeType: 'neutral',
      icon: UserCheck,
    },
    {
      title: 'Duplicate Entries',
      value: 45,
      change: 'Needs cleanup',
      changeType: 'neutral',
      icon: UserX,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Contact ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'first_name',
      label: 'Name',
      sortable: true,
      render: (value, row: any) => `${value} ${row.last_name || ''}`,
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (value) => (
        <span>{value || 'N/A'}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'phone',
      label: 'Phone',
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
      title: 'Contact Creation Trends',
      data: [
        { name: 'Mon', value: 32 },
        { name: 'Tue', value: 45 },
        { name: 'Wed', value: 38 },
        { name: 'Thu', value: 52 },
        { name: 'Fri', value: 41 },
        { name: 'Sat', value: 18 },
        { name: 'Sun', value: 15 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Contacts by Portal Type',
      data: [
        { name: 'Patient-Provider', value: 1245 },
        { name: 'Provider-Provider', value: 687 },
        { name: 'Patient-Pharmacy', value: 423 },
        { name: 'Other', value: 492 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Contact Directory Management"
      description="Monitor and manage all user contacts across portals"
      icon={Users}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllContacts()}
      exportTableName="admin_contacts_directory"
      moderationTarget="system_contacts"
      charts={charts}
    />
  );
}
