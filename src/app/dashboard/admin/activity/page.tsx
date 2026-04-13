import { useState, useEffect } from 'react';
import { Activity, Search, Download } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import AdminStatsCard from '../../../../components/admin/AdminStatsCard';
import AdminDataTable, { TableColumn } from '../../../../components/admin/AdminDataTable';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import { adminCRUDService } from '../../../../services/adminCRUDService';
import { supabase } from '../../../../lib/supabase';

export default function ActivityMonitoringPage() {
  const { currentColors } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalActivities: 0,
    todayActivities: 0,
    uniqueAdmins: 0,
    criticalActions: 0,
  });

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin:admin_user_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      let filteredData = data || [];

      if (entityFilter !== 'all') {
        filteredData = filteredData.filter(item => item.entity_type === entityFilter);
      }

      if (actionFilter !== 'all') {
        filteredData = filteredData.filter(item => item.action === actionFilter);
      }

      setLogs(filteredData);

      const today = new Date().toDateString();
      const todayCount = filteredData.filter(item =>
        new Date(item.created_at).toDateString() === today
      ).length;

      const uniqueAdmins = new Set(filteredData.map(item => item.admin_user_id)).size;

      const criticalActions = filteredData.filter(item =>
        ['delete', 'hard_delete', 'bulk_delete'].includes(item.action)
      ).length;

      setStats({
        totalActivities: filteredData.length,
        todayActivities: todayCount,
        uniqueAdmins,
        criticalActions,
      });
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionVariant = (action: string) => {
    if (action?.includes('delete')) return 'danger';
    if (action?.includes('create')) return 'success';
    if (action?.includes('update')) return 'info';
    return 'default';
  };

  const handleExport = async () => {
    try {
      const blob = await adminCRUDService.exportToCSV('admin_audit_log');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_activity_log_${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      render: (value) => (
        <div>
          <div className="font-medium">
            {new Date(value).toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-500">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'admin',
      label: 'Admin User',
      render: (value) => (
        <div>
          <div className="font-medium">
            {value ? `${value.first_name} ${value.last_name}` : 'Unknown'}
          </div>
          <div className="text-sm text-gray-500">{value?.email}</div>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (value) => (
        <AdminStatusBadge
          status={value}
          variant={getActionVariant(value)}
        />
      ),
    },
    {
      key: 'entity_type',
      label: 'Entity Type',
      sortable: true,
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value) => value || 'N/A',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity size={32} style={{ color: currentColors.primary }} />
          <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
            Activity Monitoring
          </h1>
        </div>
        <p style={{ color: currentColors.textSecondary }}>
          Track all administrative actions and changes across the system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminStatsCard
          title="Total Activities"
          value={stats.totalActivities}
          icon={Activity}
        />
        <AdminStatsCard
          title="Today's Activities"
          value={stats.todayActivities}
          icon={Activity}
        />
        <AdminStatsCard
          title="Active Admins"
          value={stats.uniqueAdmins}
          icon={Activity}
        />
        <AdminStatsCard
          title="Critical Actions"
          value={stats.criticalActions}
          icon={Activity}
          changeType={stats.criticalActions > 0 ? 'decrease' : 'neutral'}
        />
      </div>

      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: currentColors.cardBg,
          borderColor: currentColors.border,
        }}
      >
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: currentColors.textSecondary }}
            />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentColors.background,
                borderColor: currentColors.border,
                color: currentColors.text,
              }}
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
            style={{
              backgroundColor: currentColors.background,
              borderColor: currentColors.border,
              color: currentColors.text,
            }}
          >
            <option value="all">All Entity Types</option>
            <option value="providers">Providers</option>
            <option value="user_profiles">Patients</option>
            <option value="pharmacies">Pharmacies</option>
            <option value="appointments">Appointments</option>
            <option value="clinic_locations">Locations</option>
            <option value="medical_services">Services</option>
            <option value="medical_assets">Assets</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
            style={{
              backgroundColor: currentColors.background,
              borderColor: currentColors.border,
              color: currentColors.text,
            }}
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="soft_delete">Soft Delete</option>
            <option value="hard_delete">Hard Delete</option>
            <option value="restore">Restore</option>
            <option value="bulk_update">Bulk Update</option>
            <option value="bulk_delete">Bulk Delete</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:opacity-70 transition-opacity"
            style={{
              borderColor: currentColors.border,
              color: currentColors.text,
            }}
          >
            <Download size={20} />
            Export
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentColors.primary }} />
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredLogs}
            emptyMessage="No activity logs found"
            itemsPerPage={20}
          />
        )}
      </div>
    </div>
  );
}
