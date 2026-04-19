import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Users, CheckCircle, Clock, Settings, UserPlus, CalendarDays, Mail, Bell, TrendingUp, MapPin, Shield, Stethoscope, DollarSign, FileText, Activity, ClipboardList, Loader2 } from 'lucide-react';
import CurrentPlanBanner from '../../../../components/subscription/CurrentPlanBanner';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation, ClinicNotification } from '../../../../services/clinicService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function ClinicDashboardPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [notifications, setNotifications] = useState<ClinicNotification[]>([]);
  const [stats, setStats] = useState({ totalProviders: 0, activeProviders: 0, pendingProviders: 0 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupCity, setSetupCity] = useState('');
  const [setupProvince, setSetupProvince] = useState('');
  const [creatingClinic, setCreatingClinic] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const data = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(data);
      if (data) {
        const [s, affs, notifs] = await Promise.all([
          clinicService.getClinicStats(data.id),
          clinicService.getClinicAffiliations(data.id),
          clinicService.getClinicNotifications(user!.id),
        ]);
        setStats(s);
        setAffiliations(affs);
        setNotifications(notifs.slice(0, 5));

        const activeProviderIds = affs.filter(a => a.status === 'active').map(a => a.provider_id);
        if (activeProviderIds.length > 0) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          const [appts, todayAppts, upcomingAppts] = await Promise.all([
            clinicService.getClinicAppointments(activeProviderIds, { dateFrom: thirtyDaysAgo, dateTo: today }),
            clinicService.getClinicTodayAppointments(activeProviderIds),
            clinicService.getClinicUpcomingAppointments(activeProviderIds),
          ]);
          setAppointments(appts);
          setTodayAppointments(todayAppts);
          setUpcomingAppointments(upcomingAppts);

          const uniquePatientIds = new Set(appts.map((a: any) => a.patient_id).filter(Boolean));
          setTotalPatients(uniquePatientIds.size);

          const completedThisMonth = appts.filter((a: any) => a.status === 'completed');
          const revenue = completedThisMonth.reduce((sum: number, a: any) => sum + (a.amount || a.fee || 0), 0);
          setMonthlyRevenue(revenue);
        }
      }
    } catch (error) {
      console.error('Error loading clinic:', error);
    } finally {
      setLoading(false);
    }
  };

  const appointmentsByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    appointments.forEach(a => {
      if (days[a.appointment_date] !== undefined) days[a.appointment_date]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      day: new Date(date).toLocaleDateString('en-CA', { weekday: 'short' }),
      count,
    }));
  }, [appointments]);

  const appointmentsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const monthlyTrend = useMemo(() => {
    const weeks: Record<string, number> = {};
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const label = `Week ${4 - i}`;
      weeks[label] = 0;
    }
    const labels = Object.keys(weeks);
    appointments.forEach(a => {
      const apptDate = new Date(a.appointment_date);
      const daysDiff = Math.floor((now.getTime() - apptDate.getTime()) / 86400000);
      const weekIndex = Math.min(3, Math.floor(daysDiff / 7));
      const key = labels[3 - weekIndex];
      if (key) weeks[key]++;
    });
    return Object.entries(weeks).map(([week, count]) => ({ week, appointments: count }));
  }, [appointments]);

  const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const handleCreateClinic = async () => {
    if (!user?.id) return;
    if (!setupName.trim()) {
      toast.error('Please enter a clinic name');
      return;
    }
    setCreatingClinic(true);
    try {
      const created = await clinicService.createClinic({
        owner_id: user.id,
        name: setupName.trim(),
        email: setupEmail.trim() || userProfile?.email || undefined,
        phone: setupPhone.trim() || userProfile?.phone || undefined,
        city: setupCity.trim() || userProfile?.city || undefined,
        province: setupProvince.trim() || userProfile?.province || undefined,
        onboarding_status: 'pending' as any,
        is_active: false,
        is_verified: false,
      });
      toast.success('Clinic created. Our team will review your application.');
      setClinic(created);
      await loadData();
    } catch (err: any) {
      console.error('Failed to create clinic', err);
      toast.error(err?.message || 'Failed to create clinic');
    } finally {
      setCreatingClinic(false);
    }
  };

  if (!clinic) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
              <Building2 size={32} className="text-sky-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up your clinic</h2>
            <p className="text-gray-500 max-w-md">
              Your clinic profile hasn't been created yet. Tell us a bit about your practice to get started — you can complete the rest later from your profile.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic name *</label>
              <input
                type="text"
                value={setupName}
                onChange={e => setSetupName(e.target.value)}
                placeholder="e.g. Riverside Family Clinic"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic email</label>
                <input
                  type="email"
                  value={setupEmail}
                  onChange={e => setSetupEmail(e.target.value)}
                  placeholder={userProfile?.email || 'clinic@example.com'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={setupPhone}
                  onChange={e => setSetupPhone(e.target.value)}
                  placeholder={userProfile?.phone || '(555) 123-4567'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={setupCity}
                  onChange={e => setSetupCity(e.target.value)}
                  placeholder={userProfile?.city || 'Toronto'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  type="text"
                  value={setupProvince}
                  onChange={e => setSetupProvince(e.target.value)}
                  placeholder={userProfile?.province || 'ON'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCreateClinic}
                disabled={creatingClinic || !setupName.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {creatingClinic ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Create clinic
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = appointments.filter(a => a.status === 'completed').length;

  const statCards = [
    { label: 'Total Providers', value: stats.totalProviders, icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: 'Active Providers', value: stats.activeProviders, icon: CheckCircle, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
    { label: "Today's Appointments", value: todayAppointments.length, icon: CalendarDays, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: 'Completed (30d)', value: completedCount, icon: TrendingUp, color: 'bg-teal-50 text-teal-600', border: 'border-teal-100' },
  ];

  const pendingAffiliations = affiliations.filter(a => a.status === 'pending');
  const recentAffiliations = affiliations.slice(0, 5);
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  const quickActions = [
    { icon: UserPlus, label: 'Manage Providers', path: '/dashboard/clinic/providers' },
    { icon: CalendarDays, label: 'Appointments', path: '/dashboard/clinic/appointments' },
    { icon: Stethoscope, label: 'Services', path: '/dashboard/clinic/services' },
    { icon: ClipboardList, label: 'Specializations', path: '/dashboard/clinic/specializations' },
    { icon: Users, label: 'Patients', path: '/dashboard/clinic/patients' },
    { icon: Activity, label: 'Staff', path: '/dashboard/clinic/staff' },
    { icon: DollarSign, label: 'Billing', path: '/dashboard/clinic/billing' },
    { icon: FileText, label: 'Schedule', path: '/dashboard/clinic/schedule' },
    { icon: Mail, label: 'Messages', path: '/dashboard/clinic/messages' },
    { icon: Settings, label: 'Settings', path: '/dashboard/clinic/settings' },
  ];

  const welcomeName = userProfile?.last_name
    ? `Dr. ${userProfile.last_name}`
    : clinic.name;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{clinic.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} /> {clinic.city}, {clinic.province}
            </span>
            {clinic.is_verified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Shield size={12} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Pending Verification
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {clinic.subscription_plan} Plan
            </span>
          </div>
          <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/clinic/profile')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Settings size={16} /> Edit Profile
        </button>
      </div>

      <CurrentPlanBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border ${card.border} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Appointments</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{todayAppointments.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <CalendarDays size={22} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{upcomingAppointments.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Clock size={22} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalPatients}</p>
            </div>
            <div className="bg-teal-100 p-3 rounded-full">
              <Users size={22} className="text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">${monthlyRevenue.toFixed(0)}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <DollarSign size={22} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointments This Week</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name="Appointments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
                <Line type="monotone" dataKey="appointments" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} name="Appointments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {appointmentsByStatus.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Status Breakdown</h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={appointmentsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {appointmentsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4">
              {appointmentsByStatus.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-sm text-gray-600 capitalize">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {pendingAffiliations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-amber-100">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Pending Affiliation Requests</h3>
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {pendingAffiliations.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {pendingAffiliations.map((aff) => (
                  <div key={aff.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {aff.providers?.user_profiles?.first_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{aff.providers?.specialty || 'General Practice'} | {aff.role_at_clinic}</p>
                      </div>
                    </div>
                    <button onClick={() => navigate('/dashboard/clinic/affiliations')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Review</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Recent Provider Activity</h3>
              <button onClick={() => navigate('/dashboard/clinic/providers')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
            </div>
            {recentAffiliations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No provider affiliations yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentAffiliations.map((aff) => (
                  <div key={aff.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                        {aff.providers?.user_profiles?.first_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{aff.providers?.specialty || 'General Practice'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      aff.status === 'active' ? 'bg-green-100 text-green-800' :
                      aff.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {aff.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Clinic Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Email', value: clinic.email || 'Not set' },
                { label: 'Phone', value: clinic.phone || 'Not set' },
                { label: 'Website', value: clinic.website || 'Not set' },
                { label: 'Billing Model', value: clinic.billing_model, capitalize: true },
                { label: 'Platform Fee', value: `${clinic.platform_fee_percentage}%` },
                { label: 'Capacity', value: `${stats.activeProviders}/${clinic.max_providers} providers` },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={`font-medium text-right ${item.capitalize ? 'capitalize' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
              {unreadNotifications > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">{unreadNotifications} new</span>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className={`p-3 rounded-lg text-sm ${n.is_read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                    <p className={`font-medium ${n.is_read ? 'text-gray-700' : 'text-blue-800'}`}>{n.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/dashboard/clinic/notifications')} className="w-full mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium text-center">View All Notifications</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition text-center group"
                >
                  <action.icon size={18} className="text-gray-400 group-hover:text-blue-600 transition" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
