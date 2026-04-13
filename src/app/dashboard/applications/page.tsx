import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  MessageSquare,
  Phone,
  Calendar,
  Users,
  Mail,
  FileText,
  StickyNote,
  Trello,
  FolderOpen,
  Share2,
  Search,
  Shield,
  Activity,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import AdminStatsCard from '../../../components/admin/AdminStatsCard';
import { adminMonitoringService } from '../../../services/adminMonitoringService';

const monitoringApps = [
  {
    name: 'Chat Monitoring',
    description: 'Monitor all chat conversations across portals',
    icon: MessageSquare,
    href: '/dashboard/chat',
    color: 'bg-blue-500',
  },
  {
    name: 'Call Oversight',
    description: 'Review and analyze all system calls',
    icon: Phone,
    href: '/dashboard/calls',
    color: 'bg-green-500',
  },
  {
    name: 'Calendar Management',
    description: 'View all scheduled events system-wide',
    icon: Calendar,
    href: '/dashboard/calendar',
    color: 'bg-orange-500',
  },
  {
    name: 'Contact Directory',
    description: 'Manage all user contacts in the system',
    icon: Users,
    href: '/dashboard/contacts',
    color: 'bg-cyan-500',
  },
  {
    name: 'Email Monitoring',
    description: 'Monitor email communications and compliance',
    icon: Mail,
    href: '/dashboard/email',
    color: 'bg-red-500',
  },
  {
    name: 'Invoice Control',
    description: 'Review all invoices and transactions',
    icon: FileText,
    href: '/dashboard/invoices',
    color: 'bg-teal-500',
  },
  {
    name: 'Notes Review',
    description: 'Access all user notes for moderation',
    icon: StickyNote,
    href: '/dashboard/notes',
    color: 'bg-yellow-500',
  },
  {
    name: 'Kanban Oversight',
    description: 'Monitor all project boards system-wide',
    icon: Trello,
    href: '/dashboard/kanban',
    color: 'bg-blue-600',
  },
  {
    name: 'File Management',
    description: 'Control and review all uploaded files',
    icon: FolderOpen,
    href: '/dashboard/file-manager',
    color: 'bg-pink-500',
  },
  {
    name: 'Social Feed Moderation',
    description: 'Monitor and moderate social posts',
    icon: Share2,
    href: '/dashboard/social-feed',
    color: 'bg-cyan-600',
  },
  {
    name: 'Search Analytics',
    description: 'View search activity and analytics',
    icon: Search,
    href: '/dashboard/search-results',
    color: 'bg-gray-600',
  },
];

export default function ApplicationsPage() {
  const { currentColors } = useTheme();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalActivities: 0,
    flaggedItems: 0,
    pendingReviews: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [flags, moderationQueue] = await Promise.all([
        adminMonitoringService.getFlaggedItems({ status: 'pending' }),
        adminMonitoringService.getContentModerationQueue({ status: 'pending' }),
      ]);

      setStats({
        totalActivities: 1247,
        flaggedItems: flags.length || 0,
        pendingReviews: moderationQueue.length || 0,
        activeUsers: 856,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
            You need administrator privileges to access this section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={32} style={{ color: currentColors.primary }} />
          <h1 className="text-3xl font-bold" style={{ color: currentColors.text }}>
            Admin Monitoring & Control Center
          </h1>
        </div>
        <p style={{ color: currentColors.textSecondary }}>
          System-wide oversight and monitoring of all portal activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminStatsCard
          title="Total Activities (24h)"
          value={stats.totalActivities}
          change="+12% from yesterday"
          changeType="increase"
          icon={Activity}
        />
        <AdminStatsCard
          title="Flagged Items"
          value={stats.flaggedItems}
          change={stats.flaggedItems > 0 ? 'Requires attention' : 'All clear'}
          changeType={stats.flaggedItems > 0 ? 'neutral' : 'neutral'}
          icon={AlertTriangle}
        />
        <AdminStatsCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          change={`${stats.pendingReviews} items in queue`}
          changeType="neutral"
          icon={FileText}
        />
        <AdminStatsCard
          title="Active Users"
          value={stats.activeUsers}
          change="+5.2% this week"
          changeType="increase"
          icon={TrendingUp}
        />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: currentColors.text }}>
          Monitoring Applications
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {monitoringApps.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.name}
              to={app.href}
              className="group rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 border"
              style={{
                backgroundColor: currentColors.cardBg,
                borderColor: currentColors.border,
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`${app.color} p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: currentColors.text }}>
                  {app.name}
                </h3>
                <p className="text-sm" style={{ color: currentColors.textSecondary }}>
                  {app.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
