import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Flag, Eye, Download, Loader2 } from 'lucide-react';
import { Video as LucideIcon } from 'lucide-react';
import AdminStatsCard from './AdminStatsCard';
import AdminFilterBar from './AdminFilterBar';
import AdminDataTable, { TableColumn, TableAction } from './AdminDataTable';
import AdminModerationPanel from './AdminModerationPanel';
import AdminChart, { ChartData } from './AdminChart';
import { adminMonitoringService } from '../../services/adminMonitoringService';

export interface StatsConfig {
  title: string;
  value: number | string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
}

export interface AdminMonitoringTemplateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  statsConfig: StatsConfig[];
  columns: TableColumn[];
  dataFetcher: (filters?: any) => Promise<any[]>;
  exportTableName: string;
  moderationTarget: string;
  charts?: {
    type: 'line' | 'bar' | 'pie';
    data: ChartData[];
    title: string;
    dataKey?: string;
  }[];
  customActions?: TableAction[];
}

export default function AdminMonitoringTemplate({
  title,
  description,
  icon: Icon,
  statsConfig,
  columns,
  dataFetcher,
  exportTableName,
  moderationTarget,
  charts,
  customActions,
}: AdminMonitoringTemplateProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showModerationPanel, setShowModerationPanel] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await dataFetcher();
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (filters: any) => {
    let filtered = [...data];

    if (filters.portal && filters.portal !== 'all') {
      filtered = filtered.filter((item) => item.portal_type === filters.portal);
    }

    if (filters.flagged) {
      filtered = filtered.filter((item) => item.is_flagged);
    }

    if (filters.search) {
      filtered = filtered.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    setFilteredData(filtered);
  };

  const handleViewItem = (item: any) => {
    setSelectedItem(item);
  };

  const handleModerationAction = async (actionId: string, reason?: string) => {
    if (!selectedItem) return;

    await adminMonitoringService.logModerationAction({
      action_type: actionId,
      target_table: moderationTarget,
      target_record_id: selectedItem.id,
      action_description: `${moderationTarget} ${actionId}`,
      reason,
    });

    if (actionId === 'flag') {
      await adminMonitoringService.createFlag({
        flagged_table: moderationTarget,
        flagged_record_id: selectedItem.id,
        flag_type: moderationTarget,
        priority: 'medium',
        reason: reason || 'Flagged by admin',
      });
    }

    loadData();
  };

  const defaultActions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleViewItem,
    },
    {
      label: 'Flag Item',
      icon: <Flag className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedItem(row);
        setShowModerationPanel(true);
      },
      variant: 'warning',
    },
    {
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      onClick: async (row) => {
        const blob = await adminMonitoringService.exportData(exportTableName, { id: row.id });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportTableName}-${row.id}.csv`;
        a.click();
      },
    },
  ];

  const actions = customActions || defaultActions;

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="p-8 rounded-lg border bg-card text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access this monitoring page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsConfig.map((stat, index) => (
          <AdminStatsCard key={index} {...stat} />
        ))}
      </div>

      <AdminFilterBar
        onSearch={(query) => handleFilter({ search: query })}
        onPortalFilter={(portal) => handleFilter({ portal })}
        onFlaggedFilter={(flagged) => handleFilter({ flagged })}
        showFlaggedToggle={true}
      />

      {charts && charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {charts.map((chart, index) => (
            <AdminChart
              key={index}
              type={chart.type}
              data={chart.data}
              title={chart.title}
              dataKey={chart.dataKey}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">All Records</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredData}
            actions={actions}
            onRowClick={handleViewItem}
            emptyMessage="No records found"
          />
        )}
      </div>

      <AdminModerationPanel
        isOpen={showModerationPanel}
        onClose={() => setShowModerationPanel(false)}
        item={selectedItem}
        itemType={moderationTarget}
        onAction={handleModerationAction}
      />
    </div>
  );
}
