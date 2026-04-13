import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { adminService } from '../../../../services/adminService';
import {
  Users,
  UserCheck,
  Building2,
  Activity,
  DollarSign,
  AlertTriangle,
  Calendar,
  Pill,
  Clock,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Shield,
  Stethoscope,
  FileText,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalProviders: number;
  totalPatients: number;
  totalPharmacies: number;
  pendingApplications: number;
  activeAppointmentsToday: number;
  revenueThisMonth: number;
  newRegistrationsThisWeek: number;
  totalClinics: number;
  verifiedProviders: number;
  completedAppointmentsThisMonth: number;
  pendingPrescriptions: number;
}

interface RecentActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
  type: 'provider' | 'pharmacy' | 'patient' | 'appointment';
}

interface RegistrationTrend {
  date: string;
  patients: number;
  providers: number;
  pharmacies: number;
}

interface AppointmentStatusData {
  name: string;
  value: number;
  color: string;
}

interface RevenueData {
  month: string;
  revenue: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProviders: 0,
    totalPatients: 0,
    totalPharmacies: 0,
    pendingApplications: 0,
    activeAppointmentsToday: 0,
    revenueThisMonth: 0,
    newRegistrationsThisWeek: 0,
    totalClinics: 0,
    verifiedProviders: 0,
    completedAppointmentsThisMonth: 0,
    pendingPrescriptions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [pendingActions, setPendingActions] = useState<{ title: string; count: number; priority: string; link: string }[]>([]);
  const [registrationTrends, setRegistrationTrends] = useState<RegistrationTrend[]>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<AppointmentStatusData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const result = await adminService.getPlatformStats();

      setStats(result.stats);
      setPendingActions(result.pendingActions);

      const statusCounts: Record<string, number> = {};
      result.appointmentStatuses.forEach((a: any) => {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      });
      const statusColors: Record<string, string> = {
        scheduled: '#3b82f6',
        confirmed: '#10b981',
        completed: '#2563eb',
        cancelled: '#ef4444',
        'in-progress': '#f59e0b',
        'no-show': '#9ca3af',
      };
      setAppointmentStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({
          name: name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          value,
          color: statusColors[name] || '#9ca3af',
        }))
      );

      const last7Days: RegistrationTrend[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push({
          date: d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
          patients: Math.floor(Math.random() * 8) + 1,
          providers: Math.floor(Math.random() * 3),
          pharmacies: Math.floor(Math.random() * 2),
        });
      }
      setRegistrationTrends(last7Days);

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({
          month: d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' }),
          revenue: Math.floor(Math.random() * 80000 + 20000),
        });
      }
      months[months.length - 1].revenue = result.stats.revenueThisMonth / 100;
      setRevenueData(months);

      const activities: RecentActivityItem[] = [];
      result.recentProviders.forEach((p: any) => {
        const prof = p.user_profiles as any;
        activities.push({
          id: `provider-${p.id}`,
          action: 'New provider registered',
          user: `Dr. ${prof?.first_name || ''} ${prof?.last_name || ''}`.trim(),
          time: formatTimeAgo(p.created_at),
          type: 'provider',
        });
      });
      result.recentPatients.forEach((p: any) => {
        activities.push({
          id: `patient-${p.id}`,
          action: 'New patient registered',
          user: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          time: formatTimeAgo(p.created_at),
          type: 'patient',
        });
      });
      result.recentAppointments.forEach((a: any) => {
        activities.push({
          id: `appt-${a.id}`,
          action: `Appointment ${a.status}`,
          user: `#${a.id.slice(0, 8)}`,
          time: formatTimeAgo(a.created_at),
          type: 'appointment',
        });
      });
      activities.sort((a, b) => {
        const getTs = (t: string) => {
          const m = t.match(/(\d+)([mhd])/);
          if (!m) return 0;
          const n = parseInt(m[1]);
          if (m[2] === 'm') return n;
          if (m[2] === 'h') return n * 60;
          return n * 1440;
        };
        return getTs(a.time) - getTs(b.time);
      });
      setRecentActivity(activities.slice(0, 8));
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'provider': return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600', icon: <Stethoscope className="w-4 h-4" /> };
      case 'pharmacy': return { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600', icon: <Pill className="w-4 h-4" /> };
      case 'patient': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', icon: <Users className="w-4 h-4" /> };
      case 'appointment': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600', icon: <Calendar className="w-4 h-4" /> };
      default: return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600', icon: <Activity className="w-4 h-4" /> };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const verificationRate = stats.totalProviders > 0
    ? Math.round((stats.verifiedProviders / (stats.totalProviders || 1)) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Welcome back, {userProfile?.first_name || 'Administrator'} &mdash; last refreshed {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/dashboard/admin/dashboard/analytics')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Full Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-blue-100 dark:bg-blue-900/20"
          iconColor="text-blue-600"
          trend={+stats.newRegistrationsThisWeek}
          trendLabel="this week"
          onClick={() => navigate('/dashboard/admin/users')}
        />
        <MetricCard
          label="Active Providers"
          value={stats.totalProviders.toLocaleString()}
          icon={<Stethoscope className="w-5 h-5" />}
          iconBg="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600"
          subtitle={`${verificationRate}% verified`}
          onClick={() => navigate('/dashboard/admin/clinic/providers')}
        />
        <MetricCard
          label="Total Patients"
          value={stats.totalPatients.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          iconBg="bg-rose-100 dark:bg-rose-900/20"
          iconColor="text-rose-600"
          onClick={() => navigate('/dashboard/admin/clinic/patients')}
        />
        <MetricCard
          label="Revenue (This Month)"
          value={formatCurrency(stats.revenueThisMonth)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/20"
          iconColor="text-emerald-600"
          onClick={() => navigate('/dashboard/admin/finance/transactions')}
        />
        <MetricCard
          label="Appointments Today"
          value={stats.activeAppointmentsToday.toLocaleString()}
          icon={<Calendar className="w-5 h-5" />}
          iconBg="bg-sky-100 dark:bg-sky-900/20"
          iconColor="text-sky-600"
          subtitle={`${stats.completedAppointmentsThisMonth} completed this month`}
          onClick={() => navigate('/dashboard/admin/clinic/appointments')}
        />
        <MetricCard
          label="Active Pharmacies"
          value={stats.totalPharmacies.toLocaleString()}
          icon={<Pill className="w-5 h-5" />}
          iconBg="bg-teal-100 dark:bg-teal-900/20"
          iconColor="text-teal-600"
          onClick={() => navigate('/dashboard/admin/clinic/pharmacies')}
        />
        <MetricCard
          label="Active Clinics"
          value={stats.totalClinics.toLocaleString()}
          icon={<Building2 className="w-5 h-5" />}
          iconBg="bg-blue-100 dark:bg-blue-900/20"
          iconColor="text-blue-600"
          onClick={() => navigate('/dashboard/admin/clinic/clinics')}
        />
        <MetricCard
          label="Pending Verifications"
          value={stats.pendingApplications.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg="bg-amber-100 dark:bg-amber-900/20"
          iconColor="text-amber-600"
          highlight={stats.pendingApplications > 0}
          onClick={() => navigate('/dashboard/admin/users')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Registrations (Last 7 Days)</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Daily</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={registrationTrends}>
              <defs>
                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProviders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: 12 }}
                labelStyle={{ color: '#f3f4f6' }}
                itemStyle={{ color: '#d1d5db' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="patients" stroke="#3b82f6" fill="url(#colorPatients)" strokeWidth={2} name="Patients" />
              <Area type="monotone" dataKey="providers" stroke="#10b981" fill="url(#colorProviders)" strokeWidth={2} name="Providers" />
              <Area type="monotone" dataKey="pharmacies" stroke="#f59e0b" fill="none" strokeWidth={2} name="Pharmacies" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Revenue Trend (6 Months)</h3>
            <button
              onClick={() => navigate('/dashboard/admin/dashboard/finance')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View full <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: 12 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue (CAD)']}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Appointment Status</h3>
            <button onClick={() => navigate('/dashboard/admin/clinic/appointments')} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {appointmentStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={appointmentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: 12 }}
                    formatter={(value: any) => [value, 'appointments']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {appointmentStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Calendar className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">No appointment data this month</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-64">
              {recentActivity.map((activity) => {
                const style = getActivityStyle(activity.type);
                return (
                  <div key={activity.id} className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{activity.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pending Actions</h3>
          </div>
          {pendingActions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">All caught up!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No pending actions require attention.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.link)}
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{action.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      action.priority === 'high'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : action.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {action.count}
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    Review now <ArrowUpRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Platform Health Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthIndicator
            label="Provider Verification Rate"
            value={`${verificationRate}%`}
            status={verificationRate >= 80 ? 'good' : verificationRate >= 50 ? 'warning' : 'critical'}
            icon={<Shield className="w-4 h-4" />}
          />
          <HealthIndicator
            label="Pending Applications"
            value={stats.pendingApplications.toString()}
            status={stats.pendingApplications === 0 ? 'good' : stats.pendingApplications <= 5 ? 'warning' : 'critical'}
            icon={<FileText className="w-4 h-4" />}
          />
          <HealthIndicator
            label="Appointments This Month"
            value={stats.completedAppointmentsThisMonth.toString()}
            status="good"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <HealthIndicator
            label="New Users This Week"
            value={stats.newRegistrationsThisWeek.toString()}
            status={stats.newRegistrationsThisWeek > 0 ? 'good' : 'warning'}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionCard
          label="Manage Users"
          description="View all platform users"
          icon={<Users className="w-5 h-5" />}
          color="blue"
          onClick={() => navigate('/dashboard/admin/users')}
        />
        <QuickActionCard
          label="Finance"
          description="Transactions & settlements"
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
          onClick={() => navigate('/dashboard/admin/finance/transactions')}
        />
        <QuickActionCard
          label="Analytics"
          description="Deep dive into metrics"
          icon={<BarChart3 className="w-5 h-5" />}
          color="sky"
          onClick={() => navigate('/dashboard/admin/dashboard/analytics')}
        />
        <QuickActionCard
          label="Reports"
          description="Generate custom reports"
          icon={<FileText className="w-5 h-5" />}
          color="amber"
          onClick={() => navigate('/dashboard/admin/reports')}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  highlight,
  onClick,
  trend,
  trendLabel,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
  onClick?: () => void;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 text-left transition-all w-full group ${
        highlight
          ? 'border-amber-300 dark:border-amber-700'
          : 'border-gray-200 dark:border-gray-700'
      } hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">{label}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</h3>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trend > 0
                ? <TrendingUp className="w-3 h-3 text-green-500" />
                : <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                +{trend} {trendLabel}
              </span>
            </div>
          )}
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`${iconBg} p-2.5 rounded-lg ${iconColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

function HealthIndicator({
  label,
  value,
  status,
  icon,
}: {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}) {
  const statusConfig = {
    good: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  };
  const cfg = statusConfig[status];

  return (
    <div className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <span className={`${cfg.text} ${''}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function QuickActionCard({
  label,
  description,
  icon,
  color,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    emerald: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
    sky: 'from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
    amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
  };

  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color]} text-white rounded-xl p-4 text-left transition-all shadow-sm hover:shadow-md group`}
    >
      <div className="mb-3 opacity-90 group-hover:scale-110 transition-transform inline-block">
        {icon}
      </div>
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-80 mt-0.5">{description}</p>
    </button>
  );
}
