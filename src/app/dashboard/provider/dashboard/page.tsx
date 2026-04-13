import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { providerService } from '../../../../services/providerService';
import { providerDashboardService, DashboardStats, AppointmentMetrics, FinancialMetrics, PatientInsights } from '../../../../services/providerDashboardService';
import { providerOnboardingService } from '../../../../services/providerOnboardingService';
import { supabase } from '../../../../lib/supabase';
import { Link } from 'react-router-dom';
import ProviderOnboardingWizard from '../../../../components/provider/ProviderOnboardingWizard';
import { CalendarDays, DollarSign, Users, Video, TrendingUp, Pill, Mail, FileText, UserCog, CheckCircle, CalendarCheck, CalendarX, PersonStanding, RefreshCw, Clock, ChevronDown, FileHeart, Receipt, CheckCheck, Bell } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Button } from '../../../../components/ui/button';
import { CHART_COLORS, chartTooltipStyle, chartAxisColor, chartGridColor } from '../../../../config/chartColors';
import CurrentPlanBanner from '../../../../components/subscription/CurrentPlanBanner';

type TimePeriod = 'weekly' | 'monthly' | 'yearly';

interface UpcomingAppointment {
  id: string;
  patient_name: string;
  patient_id: string;
  appointment_type: string;
  appointment_date: string;
  start_time: string;
  department?: string;
}

interface StatCardData {
  label: string;
  value: number;
  change: number;
  icon: any;
  color: string;
}

interface TopPatient {
  id: string;
  name: string;
  phone: string;
  appointmentCount: number;
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointmentMetrics, setAppointmentMetrics] = useState<AppointmentMetrics | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [patientInsights, setPatientInsights] = useState<PatientInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [statCards, setStatCards] = useState<StatCardData[]>([]);
  const [topPatients, setTopPatients] = useState<TopPatient[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [appointmentStatsFilter, setAppointmentStatsFilter] = useState<TimePeriod>('monthly');
  const [topPatientsFilter, setTopPatientsFilter] = useState<TimePeriod>('weekly');
  const [earningsTrendDays, setEarningsTrendDays] = useState<7 | 30 | 90>(30);
  const [onboardingApplication, setOnboardingApplication] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user, timePeriod]);

  const loadData = async () => {
    if (!user) return;

    setError(null);
    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      if (!providerData || providerData.onboarding_status === 'pending' || providerData.onboarding_status === 'rejected') {
        const existingApp = await providerOnboardingService.getApplicationByUserId(user.id);
        setOnboardingApplication(existingApp);
        if (!existingApp || existingApp.application_status === 'draft' || existingApp.application_status === 'resubmission_required') {
          setShowOnboarding(true);
        }
        setLoading(false);
        return;
      }

      if (providerData.onboarding_status === 'submitted' || providerData.onboarding_status === 'under_review') {
        setProvider(null);
        setOnboardingApplication({ application_status: providerData.onboarding_status });
        setLoading(false);
        return;
      }

      setProvider(providerData);

      const [dashStats, apptMetrics, finMetrics, ptInsights] = await Promise.all([
        providerDashboardService.getDashboardStats(providerData.id),
        providerDashboardService.getAppointmentMetrics(providerData.id, 30),
        providerDashboardService.getFinancialMetrics(providerData.id, 30),
        providerDashboardService.getPatientInsights(providerData.id, 30)
      ]);

      setStats(dashStats);
      setAppointmentMetrics(apptMetrics);
      setFinancialMetrics(finMetrics);
      setPatientInsights(ptInsights);

      await loadUpcomingAppointments(providerData.id);
      await loadStatCards(providerData.id);
      await loadTopPatients(providerData.id);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingAppointments = async (providerId: string) => {
    const { data } = await supabase
      .from('appointments')
      .select('*, patients(*, user_profiles(first_name, last_name))')
      .eq('provider_id', providerId)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5);

    if (data) {
      setUpcomingAppointments(data.map(apt => ({
        id: apt.id,
        patient_name: `${apt.patients?.user_profiles?.first_name || ''} ${apt.patients?.user_profiles?.last_name || ''}`,
        patient_id: apt.patient_id,
        appointment_type: apt.appointment_type,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        department: apt.department
      })));
    }
  };

  const loadStatCards = async (providerId: string) => {
    const days = timePeriod === 'weekly' ? 7 : timePeriod === 'monthly' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', providerId)
      .gte('appointment_date', startDate.toISOString().split('T')[0]);

    const totalPatients = new Set(appointments?.map(a => a.patient_id)).size;
    const videoConsultations = appointments?.filter(a => a.appointment_type === 'virtual').length || 0;
    const rescheduled = appointments?.filter(a => a.status === 'rescheduled').length || 0;
    const preVisitBookings = appointments?.filter(a => new Date(a.appointment_date) > new Date()).length || 0;
    const walkinBookings = appointments?.filter(a => a.appointment_type === 'walk-in').length || 0;
    const followUps = appointments?.filter(a => a.is_follow_up).length || 0;

    setStatCards([
      { label: 'Total Patient', value: totalPatients, change: 31, icon: UserCog, color: 'blue' },
      { label: 'Video...', value: videoConsultations, change: -21, icon: Video, color: 'cyan' },
      { label: 'Rescheduled', value: rescheduled, change: 64, icon: RefreshCw, color: 'green' },
      { label: 'Pre Visit Bookings', value: preVisitBookings, change: 38, icon: CalendarCheck, color: 'red' },
      { label: 'Walkin Bookings', value: walkinBookings, change: 95, icon: PersonStanding, color: 'blue' },
      { label: 'Follow Ups', value: followUps, change: 76, icon: CheckCircle, color: 'teal' }
    ]);
  };

  const loadTopPatients = async (providerId: string) => {
    const days = topPatientsFilter === 'weekly' ? 7 : topPatientsFilter === 'monthly' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*, patients(*, user_profiles(first_name, last_name, phone))')
      .eq('provider_id', providerId)
      .gte('appointment_date', startDate.toISOString().split('T')[0]);

    const patientCounts: { [key: string]: { name: string; phone: string; count: number } } = {};

    appointments?.forEach(apt => {
      const patientId = apt.patient_id;
      if (!patientCounts[patientId]) {
        patientCounts[patientId] = {
          name: `${apt.patients?.user_profiles?.first_name || ''} ${apt.patients?.user_profiles?.last_name || ''}`,
          phone: apt.patients?.user_profiles?.phone || '',
          count: 0
        };
      }
      patientCounts[patientId].count++;
    });

    const topPatientsList = Object.entries(patientCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, data]) => ({
        id,
        name: data.name,
        phone: data.phone,
        appointmentCount: data.count
      }));

    setTopPatients(topPatientsList);
  };

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; text: string; icon: string } } = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'bg-blue-600' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: 'bg-cyan-500' },
      green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'bg-green-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600', icon: 'bg-red-600' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-600', icon: 'bg-teal-500' }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Button onClick={loadData} className="mt-4 bg-red-600 text-white hover:bg-red-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!provider) {
    if (showOnboarding) {
      return (
        <div className="p-6">
          <ProviderOnboardingWizard
            existingApplication={onboardingApplication}
            onComplete={() => {
              setShowOnboarding(false);
              loadData();
            }}
          />
        </div>
      );
    }

    const appStatus = onboardingApplication?.application_status;
    return (
      <div className="p-6">
        <div className={`border rounded-lg p-6 ${
          appStatus === 'submitted' || appStatus === 'under_review'
            ? 'bg-sky-50 border-sky-200'
            : appStatus === 'rejected'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <h2 className={`text-xl font-bold mb-2 ${
            appStatus === 'submitted' || appStatus === 'under_review'
              ? 'text-sky-800'
              : appStatus === 'rejected'
              ? 'text-red-800'
              : 'text-amber-800'
          }`}>
            {appStatus === 'submitted' || appStatus === 'under_review'
              ? 'Application Under Review'
              : appStatus === 'rejected'
              ? 'Application Not Approved'
              : 'Complete Your Application'}
          </h2>
          <p className={`mb-4 ${
            appStatus === 'submitted' || appStatus === 'under_review'
              ? 'text-sky-700'
              : appStatus === 'rejected'
              ? 'text-red-700'
              : 'text-amber-700'
          }`}>
            {appStatus === 'submitted' || appStatus === 'under_review'
              ? 'Your application has been submitted and is being reviewed by our team. This typically takes 2-5 business days.'
              : appStatus === 'rejected'
              ? `Your application was not approved. Reason: ${onboardingApplication?.rejection_reason || 'Please contact support for details.'}`
              : 'Please complete your onboarding application to start accepting patients.'}
          </p>
          {appStatus === 'rejected' && (
            <Button
              onClick={() => setShowOnboarding(true)}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              Resubmit Application
            </Button>
          )}
          {(!appStatus || appStatus === 'draft') && (
            <Button
              onClick={() => setShowOnboarding(true)}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              Start Application
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-muted">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, Dr. {provider.user_profiles?.last_name}
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your practice today</p>
        </div>
        <Button className="flex items-center gap-2">
          <Video size={20} />
          Start Video Session
        </Button>
      </div>

      <CurrentPlanBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
            <Select defaultValue="today">
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 1).map((apt) => (
                <div key={apt.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <UserCog className="text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{apt.patient_name}</h4>
                      <p className="text-sm text-muted-foreground">#{apt.patient_id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2">General Visit</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CalendarDays className="text-muted-foreground" />
                    <span>{new Date(apt.appointment_date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="text-muted-foreground" />
                    <span>{apt.start_time}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{apt.department || 'Cardiology'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{apt.appointment_type === 'virtual' ? 'Online Consultation' : 'In-Person'}</p>
                    </div>
                  </div>
                  <Button className="w-full mb-2">
                    Start Appointment
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="bg-black text-white hover:bg-black/90 flex items-center gap-2">
                      <Mail /> Chat Now
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Video /> Video Consultation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Appointments</CardTitle>
            <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-muted-foreground">Total Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">Completed Appointments</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={appointmentMetrics?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={chartAxisColor} />
                <YAxis tick={{ fontSize: 12 }} stroke={chartAxisColor} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="appointments" stroke={CHART_COLORS[0]} strokeWidth={3} fill="url(#colorAppointments)" />
                <defs>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, index) => {
          const colors = getColorClasses(card.color);
          return (
            <Card key={index} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 ${colors.bg} rounded-lg`}>
                  <card.icon className={`text-2xl ${colors.text}`} />
                </div>
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">{card.label}</h3>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">{card.value}</span>
              </div>
              <p className={`text-sm mt-2 ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {card.change >= 0 ? '+' : ''}{card.change}% Last Week
              </p>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">Recent Appointments</CardTitle>
          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Patient</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Date & Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Mode</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Consultation Fees</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <UserCog className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{apt.patient_name}</p>
                          <p className="text-xs text-muted-foreground">+1 {apt.patient_id.slice(0, 5)} {apt.patient_id.slice(5, 10)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(apt.appointment_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - {apt.start_time}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {apt.appointment_type === 'virtual' ? 'Online' : 'In-Person'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="info">
                        Schedule
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">$400</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FileText className="text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className="text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CalendarDays className="text-2xl text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <h3 className="text-3xl font-bold text-foreground">{stats?.todayAppointments.total || 0}</h3>
            <p className="text-muted-foreground">Appointments</p>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-green-600">{stats?.todayAppointments.confirmed} confirmed</span>
              <span className="text-yellow-600">{stats?.todayAppointments.pending} pending</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="text-2xl text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <h3 className="text-3xl font-bold text-foreground">${stats?.earnings.today.toFixed(2) || '0.00'}</h3>
            <p className="text-muted-foreground">Earnings</p>
            <div className="mt-4 text-sm text-muted-foreground">
              ${stats?.earnings.pending.toFixed(2)} pending
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-2xl text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">Now</span>
            </div>
            <h3 className="text-3xl font-bold text-foreground">{stats?.patientQueue.waiting || 0}</h3>
            <p className="text-muted-foreground">In Waiting Room</p>
            <div className="mt-4 space-y-1">
              <div className="text-sm text-muted-foreground">
                {stats?.patientQueue.inProgress} in progress
              </div>
              {stats?.patientQueue.estimatedWaitTime ? (
                <div className="text-sm text-blue-600 font-medium">
                  ~{stats.patientQueue.estimatedWaitTime} min avg wait
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="text-2xl text-yellow-600" />
              </div>
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <h3 className="text-3xl font-bold text-foreground">${stats?.earnings.week.toFixed(0) || '0'}</h3>
            <p className="text-muted-foreground">Weekly Revenue</p>
            <div className="mt-4 text-sm text-green-600">
              +{Math.round((stats?.earnings.week || 0) / 7)}% avg/day
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Availability</CardTitle>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Trustcare Clinic</SelectItem>
                <SelectItem value="clinic1">Main Clinic</SelectItem>
                <SelectItem value="clinic2">Branch Office</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-border">
                  <span className="font-medium text-foreground">{day}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="text-muted-foreground" />
                    <span>11:00 PM - 12:30 PM</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Appointment Statistics</CardTitle>
            <Select value={appointmentStatsFilter} onValueChange={(value) => setAppointmentStatsFilter(value as TimePeriod)}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: 60, color: CHART_COLORS[1] },
                    { name: 'Scheduled', value: 25, color: CHART_COLORS[2] },
                    { name: 'Cancelled', value: 15, color: CHART_COLORS[3] }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {[{ color: CHART_COLORS[1] }, { color: CHART_COLORS[2] }, { color: CHART_COLORS[3] }].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Top Patients</CardTitle>
            <Select value={topPatientsFilter} onValueChange={(value) => {
              setTopPatientsFilter(value as TimePeriod);
              if (provider) loadTopPatients(provider.id);
            }}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <UserCog className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </div>
                  </div>
                  <Badge variant="info">
                    {patient.appointmentCount} Appointments
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-foreground">658</div>
              <Badge variant="success">+95%</Badge>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={[{v:1},{v:2},{v:1.5},{v:2.2},{v:1.8},{v:2.5},{v:2}]}>
                <Bar dataKey="v" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2">+21% ↑ in last 7 Days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Online Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-foreground">125</div>
              <Badge variant="destructive">-15%</Badge>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={[{v:1.8},{v:2},{v:1.6},{v:2.2},{v:1.9},{v:2.1},{v:1.7}]}>
                <Bar dataKey="v" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2">+21% ↓ in last 7 Days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Cancelled Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-foreground">35</div>
              <Badge variant="success">+45%</Badge>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={[{v:1.2},{v:1.5},{v:1.8},{v:1.6},{v:1.9},{v:1.7},{v:2}]}>
                <Bar dataKey="v" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2">+31% ↑ in last 7 Days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={financialMetrics?.revenueByService || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.service} (${entry.percentage}%)`}
                  outerRadius={80}
                  fill={CHART_COLORS[0]}
                  dataKey="amount"
                >
                  {financialMetrics?.revenueByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Insurance vs Self-Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={financialMetrics?.insuranceVsSelfPay || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.type} (${entry.percentage}%)`}
                  outerRadius={80}
                  fill={CHART_COLORS[0]}
                  dataKey="amount"
                >
                  {financialMetrics?.insuranceVsSelfPay.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? CHART_COLORS[0] : CHART_COLORS[1]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">New vs Returning Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={patientInsights?.newVsReturning || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.type} (${entry.percentage}%)`}
                  outerRadius={80}
                  fill={CHART_COLORS[0]}
                  dataKey="count"
                >
                  {patientInsights?.newVsReturning.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? CHART_COLORS[2] : CHART_COLORS[4]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Link
                to="/dashboard/provider/appointments/create"
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <CalendarDays className="text-2xl text-blue-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">New Appointment</span>
              </Link>

              <Link
                to="/dashboard/provider/prescriptions/create"
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Pill className="text-2xl text-green-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Write Prescription</span>
              </Link>

              <Link
                to="/dashboard/messages"
                className="relative flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {stats?.unreadMessageCount ? (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {stats.unreadMessageCount}
                  </span>
                ) : null}
                <Mail className="text-2xl text-blue-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Messages</span>
              </Link>

              <Link
                to="/dashboard/patient/medical-records"
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <FileHeart className="text-2xl text-blue-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Patient Records</span>
              </Link>

              <Link
                to="/dashboard/provider/insurance"
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
              >
                <Receipt className="text-2xl text-cyan-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Submit Claim</span>
              </Link>

              <Link
                to="/dashboard/provider/reports"
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
              >
                <FileText className="text-2xl text-yellow-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Reports</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats?.recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {activity.type === 'appointment' && <CalendarDays className="text-blue-600" />}
                    {activity.type === 'message' && <Mail className="text-blue-600" />}
                    {activity.type === 'prescription' && <Pill className="text-green-600" />}
                    {activity.type === 'payment' && <DollarSign className="text-yellow-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    {activity.patient_name && (
                      <p className="text-xs text-muted-foreground mt-1">Patient: {activity.patient_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Earnings Trend</CardTitle>
            <Select value={String(earningsTrendDays)} onValueChange={(value) => setEarningsTrendDays(Number(value) as 7 | 30 | 90)}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={financialMetrics?.earningsTrend.slice(-earningsTrendDays) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={chartAxisColor} />
                <YAxis tick={{ fontSize: 11 }} stroke={chartAxisColor} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="amount" stroke={CHART_COLORS[1]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Month-over-Month Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={financialMetrics?.monthlyComparison || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke={chartAxisColor} />
                <YAxis tick={{ fontSize: 11 }} stroke={chartAxisColor} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{appointmentMetrics?.avgDuration || 0} min</div>
              <p className="text-sm text-muted-foreground mt-1">Avg Consultation Time</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{appointmentMetrics?.noShowRate || 0}%</div>
              <p className="text-sm text-muted-foreground mt-1">No-Show Rate</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{patientInsights?.satisfactionScore || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Patient Satisfaction</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${financialMetrics?.outstandingPayments.amount.toFixed(0) || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Outstanding Payments</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{appointmentMetrics?.avgResponseTime || 0} min</div>
              <p className="text-sm text-muted-foreground mt-1">Avg Response Time</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-600">{appointmentMetrics?.avgPrescriptionTurnaround || 0} min</div>
              <p className="text-sm text-muted-foreground mt-1">Prescription Turnaround</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats?.telemedicineSystemStatus && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Telemedicine System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${stats.telemedicineSystemStatus.camera ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-foreground">Camera</span>
                <CheckCheck className={stats.telemedicineSystemStatus.camera ? 'text-green-500' : 'text-muted-foreground'} />
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${stats.telemedicineSystemStatus.microphone ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-foreground">Microphone</span>
                <CheckCheck className={stats.telemedicineSystemStatus.microphone ? 'text-green-500' : 'text-muted-foreground'} />
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${stats.telemedicineSystemStatus.connection ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-foreground">Connection</span>
                <CheckCheck className={stats.telemedicineSystemStatus.connection ? 'text-green-500' : 'text-muted-foreground'} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
