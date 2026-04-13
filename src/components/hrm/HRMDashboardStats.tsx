import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { hrmReportsService, HRMDashboardStats } from '../../services/hrmReportsService';

export const HRMDashboardStatsComponent: React.FC = () => {
  const [stats, setStats] = useState<HRMDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await hrmReportsService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.total_employees,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Present Today',
      value: stats.present_today,
      icon: UserCheck,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconColor: 'text-green-500',
    },
    {
      title: 'On Leave Today',
      value: stats.on_leave_today,
      icon: Calendar,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      iconColor: 'text-yellow-500',
    },
    {
      title: 'Pending Requests',
      value: stats.pending_leave_requests,
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      iconColor: 'text-orange-500',
    },
    {
      title: 'New Hires (Month)',
      value: stats.new_hires_this_month,
      icon: TrendingUp,
      color: 'teal',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      iconColor: 'text-teal-500',
    },
    {
      title: 'Attendance Rate',
      value: `${stats.attendance_rate}%`,
      icon: UserCheck,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Avg. Work Hours',
      value: `${stats.average_work_hours}h`,
      icon: Clock,
      color: 'sky',
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
      iconColor: 'text-sky-500',
    },
    {
      title: 'Monthly Payroll',
      value: `$${(stats.total_payroll_this_month / 1000).toFixed(1)}K`,
      icon: DollarSign,
      color: 'rose',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      iconColor: 'text-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
            <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
};
