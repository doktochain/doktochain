import { Trello, LayoutGrid, AlertCircle, TrendingUp } from 'lucide-react';
import AdminMonitoringTemplate, { StatsConfig } from '../../../components/admin/AdminMonitoringTemplate';
import { TableColumn } from '../../../components/admin/AdminDataTable';
import { adminMonitoringService } from '../../../services/adminMonitoringService';
import { useTheme } from '../../../contexts/ThemeContext';

export default function KanbanMonitoringPage() {
  const { currentColors } = useTheme();

  const statsConfig: StatsConfig[] = [
    {
      title: 'Total Boards',
      value: 156,
      change: '+12 this month',
      changeType: 'increase',
      icon: Trello,
    },
    {
      title: 'Flagged Boards',
      value: 3,
      change: 'Requires review',
      changeType: 'neutral',
      icon: AlertCircle,
    },
    {
      title: 'Active Boards',
      value: 98,
      change: '62.8% of total',
      changeType: 'neutral',
      icon: LayoutGrid,
    },
    {
      title: 'Tasks Completed',
      value: 1247,
      change: '+15% this week',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ];

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'Board ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'board_name',
      label: 'Board Name',
      sortable: true,
    },
    {
      key: 'owner_role',
      label: 'Owner Portal',
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'task_count',
      label: 'Total Tasks',
      sortable: true,
    },
    {
      key: 'completed_task_count',
      label: 'Completed',
      sortable: true,
      render: (value, row) => (
        <span>
          {value} ({row.task_count > 0 ? Math.round((value / row.task_count) * 100) : 0}%)
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize"
          style={{
            backgroundColor: value === 'active' ? '#10B98120' : '#6B728020',
            color: value === 'active' ? '#10B981' : '#6B7280',
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
      title: 'Task Completion Rates',
      data: [
        { name: 'Mon', value: 18 },
        { name: 'Tue', value: 22 },
        { name: 'Wed', value: 19 },
        { name: 'Thu', value: 25 },
        { name: 'Fri', value: 21 },
        { name: 'Sat', value: 8 },
        { name: 'Sun', value: 6 },
      ],
      dataKey: 'value',
    },
    {
      type: 'pie' as const,
      title: 'Boards by Portal Type',
      data: [
        { name: 'Provider', value: 87 },
        { name: 'Patient', value: 45 },
        { name: 'Pharmacy', value: 24 },
      ],
      dataKey: 'value',
    },
  ];

  return (
    <AdminMonitoringTemplate
      title="Kanban Board Oversight"
      description="Monitor all project boards and task management across portals"
      icon={Trello}
      statsConfig={statsConfig}
      columns={columns}
      dataFetcher={() => adminMonitoringService.getAllKanbanBoards()}
      exportTableName="admin_kanban_overview"
      moderationTarget="kanban_boards"
      charts={charts}
    />
  );
}
