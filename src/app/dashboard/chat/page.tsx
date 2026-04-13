import { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { MessageSquare, Flag, Eye, Download, Shield, TrendingUp, Users, AlertCircle } from 'lucide-react';
import AdminStatsCard from '../../../components/admin/AdminStatsCard';
import AdminFilterBar from '../../../components/admin/AdminFilterBar';
import AdminDataTable, { TableColumn, TableAction } from '../../../components/admin/AdminDataTable';
import AdminModerationPanel from '../../../components/admin/AdminModerationPanel';
import AdminChart from '../../../components/admin/AdminChart';
import { adminMonitoringService } from '../../../services/adminMonitoringService';

export default function ChatMonitoringPage() {
  const { currentColors } = useTheme();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [stats, setStats] = useState({
    totalConversations: 0,
    flaggedConversations: 0,
    activeChats: 0,
    totalMessages: 0,
  });

  useEffect(() => {
    loadChatData();
  }, []);

  const loadChatData = async () => {
    try {
      const data = await adminMonitoringService.getAllConversations();
      setConversations(data);
      setFilteredConversations(data);

      setStats({
        totalConversations: data.length,
        flaggedConversations: data.filter((c: any) => c.is_flagged).length,
        activeChats: data.filter((c: any) => c.status === 'active').length,
        totalMessages: data.reduce((sum: number, c: any) => sum + (c.message_count || 0), 0),
      });
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (filters: any) => {
    let filtered = [...conversations];

    if (filters.portal && filters.portal !== 'all') {
      filtered = filtered.filter((c) => c.portal_type === filters.portal);
    }

    if (filters.flagged) {
      filtered = filtered.filter((c) => c.is_flagged);
    }

    if (filters.search) {
      filtered = filtered.filter((c) =>
        c.subject?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredConversations(filtered);
  };

  const handleViewConversation = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const handleModerationAction = async (actionId: string, reason?: string) => {
    if (!selectedConversation) return;

    await adminMonitoringService.logModerationAction({
      action_type: actionId,
      target_table: 'chat_conversations',
      target_record_id: selectedConversation.id,
      action_description: `Chat conversation ${actionId}`,
      reason,
    });

    if (actionId === 'flag') {
      await adminMonitoringService.createFlag({
        flagged_table: 'chat_conversations',
        flagged_record_id: selectedConversation.id,
        flag_type: 'chat',
        priority: 'medium',
        reason: reason || 'Flagged by admin',
      });
    }

    loadChatData();
  };

  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (value) => value?.substring(0, 8),
    },
    {
      key: 'participants',
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
      key: 'message_count',
      label: 'Messages',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: value === 'active' ? '#10B98120' : '#6B728020',
            color: value === 'active' ? '#10B981' : '#6B7280',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'is_flagged',
      label: 'Flagged',
      render: (value) =>
        value ? (
          <Flag size={18} className="text-red-500" />
        ) : (
          <span style={{ color: currentColors.textSecondary }}>-</span>
        ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: handleViewConversation,
    },
    {
      label: 'Flag Conversation',
      icon: <Flag size={16} />,
      onClick: (row) => {
        setSelectedConversation(row);
        setShowModerationPanel(true);
      },
      variant: 'warning',
    },
    {
      label: 'Export',
      icon: <Download size={16} />,
      onClick: async (row) => {
        const blob = await adminMonitoringService.exportData('chat_sessions', { id: row.id });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${row.id}.csv`;
        a.click();
      },
    },
  ];

  const activityData = [
    { name: 'Mon', value: 45 },
    { name: 'Tue', value: 52 },
    { name: 'Wed', value: 49 },
    { name: 'Thu', value: 63 },
    { name: 'Fri', value: 58 },
    { name: 'Sat', value: 35 },
    { name: 'Sun', value: 28 },
  ];

  const portalDistribution = [
    { name: 'Patient-Provider', value: 245 },
    { name: 'Provider-Provider', value: 89 },
    { name: 'Patient-Pharmacy', value: 67 },
  ];

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-6">
        <div
          className="p-8 rounded-lg border text-center"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <Shield size={48} className="mx-auto mb-4" style={{ color: currentColors.primary }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: currentColors.text }}>
            Admin Access Required
          </h2>
          <p style={{ color: currentColors.textSecondary }}>
            You need administrator privileges to access chat monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare size={32} style={{ color: currentColors.primary }} />
          <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
            Chat Monitoring System
          </h1>
        </div>
        <p style={{ color: currentColors.textSecondary }}>
          Monitor all chat conversations across patient, provider, and pharmacy portals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminStatsCard
          title="Total Conversations"
          value={stats.totalConversations}
          change="+8% from last week"
          changeType="increase"
          icon={MessageSquare}
        />
        <AdminStatsCard
          title="Flagged Conversations"
          value={stats.flaggedConversations}
          change={stats.flaggedConversations > 0 ? 'Requires review' : 'All clear'}
          changeType={stats.flaggedConversations > 0 ? 'neutral' : 'neutral'}
          icon={AlertCircle}
        />
        <AdminStatsCard
          title="Active Chats"
          value={stats.activeChats}
          change="Real-time"
          changeType="neutral"
          icon={Users}
        />
        <AdminStatsCard
          title="Total Messages"
          value={stats.totalMessages}
          change="+15% this week"
          changeType="increase"
          icon={TrendingUp}
        />
      </div>

      <AdminFilterBar
        onSearch={(query) => handleFilter({ search: query })}
        onPortalFilter={(portal) => handleFilter({ portal })}
        onFlaggedFilter={(flagged) => handleFilter({ flagged })}
        showFlaggedToggle={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AdminChart
          type="line"
          data={activityData}
          title="Chat Activity (Last 7 Days)"
          dataKey="value"
          xAxisKey="name"
        />
        <AdminChart
          type="pie"
          data={portalDistribution}
          title="Conversations by Portal Type"
          dataKey="value"
        />
      </div>

      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: currentColors.cardBg,
          borderColor: currentColors.border,
        }}
      >
        <h2 className="text-xl font-semibold mb-4" style={{ color: currentColors.text }}>
          All Conversations
        </h2>
        <AdminDataTable
          columns={columns}
          data={filteredConversations}
          actions={actions}
          onRowClick={handleViewConversation}
          emptyMessage="No conversations found"
        />
      </div>

      <AdminModerationPanel
        isOpen={showModerationPanel}
        onClose={() => setShowModerationPanel(false)}
        item={selectedConversation}
        itemType="Chat Conversation"
        onAction={handleModerationAction}
      />
    </div>
  );
}
