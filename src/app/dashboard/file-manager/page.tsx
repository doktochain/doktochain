import { FolderOpen, File, AlertCircle, Database, HardDrive } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function FileMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Files',
      value: 15847,
      change: '+234 this week',
      changeType: 'increase',
      icon: File,
    },
    {
      title: 'Flagged Files',
      value: 18,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Storage Used',
      value: '2.4 TB',
      change: '68% of quota',
      changeType: 'neutral',
      icon: Database,
    },
    {
      title: 'Virus Scans Pending',
      value: 45,
      change: 'In queue',
      changeType: 'neutral',
      icon: HardDrive,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Document ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'document_name',
      label: 'Document Name',
      sortable: true,
    },
    {
      key: 'document_type',
      label: 'Type',
      render: (value) => (
        <span className="capitalize">{value?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'file_size',
      label: 'Size',
      sortable: true,
      render: (value) => {
        if (!value) return 'N/A';
        const mb = (value / 1024 / 1024).toFixed(2);
        return `${mb} MB`;
      },
    },
    {
      key: 'provider_id',
      label: 'Provider',
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'verification_status',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize"
          style={{
            backgroundColor: value === 'verified' ? '#10B98120' : value === 'pending' ? '#F59E0B20' : '#EF444420',
            color: value === 'verified' ? '#10B981' : value === 'pending' ? '#F59E0B' : '#EF4444',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'uploaded_at',
      label: 'Uploaded',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const charts = [
    {
      type: 'line' as const,
      title: 'File Uploads (Last 7 Days)',
      data: [
        { name: 'Mon', value: 32 },
        { name: 'Tue', value: 38 },
        { name: 'Wed', value: 35 },
        { name: 'Thu', value: 42 },
        { name: 'Fri', value: 39 },
        { name: 'Sat', value: 18 },
        { name: 'Sun', value: 14 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Files by Type',
      data: [
        { name: 'PDF', value: 6543 },
        { name: 'Images', value: 4234 },
        { name: 'Documents', value: 3145 },
        { name: 'Other', value: 1925 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="File Management & Storage Control"
      description="Monitor and control all uploaded files across the platform"
      icon={FolderOpen}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllFiles()}
      exportTableName="admin_file_monitoring"
      moderationTarget="file_uploads"
      charts={charts}
    />
  );
}
