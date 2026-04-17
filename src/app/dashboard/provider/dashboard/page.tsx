import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { providerService } from '../../../../services/providerService';
import { providerDashboardService, DashboardStats, AppointmentMetrics, FinancialMetrics, PatientInsights } from '../../../../services/providerDashboardService';
import { providerOnboardingService } from '../../../../services/providerOnboardingService';
import { api } from '../../../../lib/api-client';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  status?: string;
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

interface AppointmentStatusSlice {
  name: string;
  value: number;
  color: string;
}

interface RecentAppointmentRow {
  id: string;
  patient_name: string;
  phone: string;
  appointment_date: string;
  start_time: string;
  appointment_type: string;
  status: string;
  consultation_fee_cents?: number;
}

interface SummaryCardData {
  current: number;
  change: number;
  trend: { v: number }[];
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
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
  const [upcomingFilter, setUpcomingFilter] = useState<'today' | 'this-week' | 'this-month'>('today');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [appointmentStatsFilter, setAppointmentStatsFilter] = useState<TimePeriod>('monthly');
  const [topPatientsFilter, setTopPatientsFilter] = useState<TimePeriod>('weekly');
  const [earningsTrendDays, setEarningsTrendDays] = useState<7 | 30 | 90>(30);
  const [providerLocations, setProviderLocations] = useState<any[]>([]);
  const [availabilitySchedule, setAvailabilitySchedule] = useState<any[]>([]);
  const [appointmentStatusPie, setAppointmentStatusPie] = useState<AppointmentStatusSlice[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointmentRow[]>([]);
  const [totalAppointmentsCard, setTotalAppointmentsCard] = useState<SummaryCardData>({ current: 0, change: 0, trend: [] });
  const [onlineConsultationsCard, setOnlineConsultationsCard] = useState<SummaryCardData>({ current: 0, change: 0, trend: [] });
  const [cancelledCard, setCancelledCard] = useState<SummaryCardData>({ current: 0, change: 0, trend: [] });
  const [onboardingApplication, setOnboardingApplication] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user, timePeriod]);

  useEffect(() => {
    if (provider) {
      loadUpcomingAppointments(provider.id);
    }
  }, [upcomingFilter]);

  useEffect(() => {
    if (provider) {
      loadAppointmentStatusPie(provider.id);
    }
  }, [appointmentStatsFilter]);

  const loadData = async () => {
    if (!user) return;

    setError(null);
    try {
      const providerData = await providerService.getProviderByUserId(user.id);

      if (!providerData || providerData.onboarding_status === 'pending' || providerData.onboarding_status === 'rejected') {
        let existingApp: any = null;
        try {
          existingApp = await providerOnboardingService.getApplicationByUserId(user.id);
        } catch (appErr) {
          console.warn('Unable to load onboarding application:', appErr);
        }
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

      const [statsRes, metricsRes, finRes, insightsRes] = await Promise.allSettled([
        providerDashboardService.getDashboardStats(providerData.id),
        providerDashboardService.getAppointmentMetrics(providerData.id, 30),
        providerDashboardService.getFinancialMetrics(providerData.id, 30),
        providerDashboardService.getPatientInsights(providerData.id, 30)
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (metricsRes.status === 'fulfilled') setAppointmentMetrics(metricsRes.value);
      if (finRes.status === 'fulfilled') setFinancialMetrics(finRes.value);
      if (insightsRes.status === 'fulfilled') setPatientInsights(insightsRes.value);

      await Promise.allSettled([
        loadUpcomingAppointments(providerData.id),
        loadStatCards(providerData.id),
        loadTopPatients(providerData.id),
        loadAvailability(providerData.id),
        loadAppointmentStatusPie(providerData.id),
        loadRecentAppointments(providerData.id),
        loadSummaryCards(providerData.id),
      ]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingAppointments = async (providerId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      let endDateStr: string | undefined;
      if (upcomingFilter === 'today') {
        endDateStr = todayStr;
      } else if (upcomingFilter === 'this-week') {
        const end = new Date(today);
        end.setDate(end.getDate() + (6 - end.getDay()));
        endDateStr = end.toISOString().split('T')[0];
      } else {
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDateStr = end.toISOString().split('T')[0];
      }

      const params: Record<string, any> = {
        provider_id: providerId,
        appointment_date_gte: todayStr,
        appointment_date_lte: endDateStr,
        order: 'appointment_date:asc',
        limit: 10,
      };

      const { data } = await api.get<any[]>('/appointments', { params });
      if (data) {
        const active = data.filter((apt: any) =>
          !['completed', 'cancelled', 'no-show'].includes(apt.status)
        );
        setUpcomingAppointments(active.map((apt: any) => ({
          id: apt.id,
          patient_name: apt.patient_name || `${apt.first_name || ''} ${apt.last_name || ''}`.trim() || 'Patient',
          patient_id: apt.patient_id,
          appointment_type: apt.appointment_type,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          department: apt.department,
          status: apt.status,
        })));
      }
    } catch (err) {
      console.warn('Failed to load upcoming appointments', err);
    }
  };

  const pctChange = (current: number, prev: number): number => {
    if (!prev) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  const loadStatCards = async (providerId: string) => {
    const days = timePeriod === 'weekly' ? 7 : timePeriod === 'monthly' ? 30 : 365;
    const now = new Date();
    const startCurrent = new Date();
    startCurrent.setDate(now.getDate() - days);
    const startPrev = new Date();
    startPrev.setDate(now.getDate() - days * 2);

    const [currentRes, prevRes] = await Promise.allSettled([
      api.get<any[]>('/appointments', {
        params: {
          provider_id: providerId,
          appointment_date_gte: startCurrent.toISOString().split('T')[0],
          appointment_date_lte: now.toISOString().split('T')[0],
          limit: 1000,
        },
      }),
      api.get<any[]>('/appointments', {
        params: {
          provider_id: providerId,
          appointment_date_gte: startPrev.toISOString().split('T')[0],
          appointment_date_lte: startCurrent.toISOString().split('T')[0],
          limit: 1000,
        },
      }),
    ]);

    const curr = currentRes.status === 'fulfilled' ? (currentRes.value.data || []) : [];
    const prev = prevRes.status === 'fulfilled' ? (prevRes.value.data || []) : [];

    const metrics = (list: any[]) => ({
      totalPatients: new Set(list.map((a: any) => a.patient_id)).size,
      videoConsultations: list.filter((a) => a.appointment_type === 'virtual').length,
      rescheduled: list.filter((a) => a.status === 'rescheduled').length,
      preVisitBookings: list.filter((a) => new Date(a.appointment_date) > new Date()).length,
      walkinBookings: list.filter((a) => a.appointment_type === 'walk-in').length,
      followUps: list.filter((a) => a.is_follow_up).length,
    });

    const c = metrics(curr);
    const p = metrics(prev);

    setStatCards([
      { label: 'Total Patients', value: c.totalPatients, change: pctChange(c.totalPatients, p.totalPatients), icon: UserCog, color: 'blue' },
      { label: 'Video Consults', value: c.videoConsultations, change: pctChange(c.videoConsultations, p.videoConsultations), icon: Video, color: 'cyan' },
      { label: 'Rescheduled', value: c.rescheduled, change: pctChange(c.rescheduled, p.rescheduled), icon: RefreshCw, color: 'green' },
      { label: 'Pre Visit Bookings', value: c.preVisitBookings, change: pctChange(c.preVisitBookings, p.preVisitBookings), icon: CalendarCheck, color: 'red' },
      { label: 'Walkin Bookings', value: c.walkinBookings, change: pctChange(c.walkinBookings, p.walkinBookings), icon: PersonStanding, color: 'blue' },
      { label: 'Follow Ups', value: c.followUps, change: pctChange(c.followUps, p.followUps), icon: CheckCircle, color: 'teal' },
    ]);
  };

  const loadAvailability = async (providerId: string) => {
    try {
      const [locRes, schedRes] = await Promise.allSettled([
        api.get<any[]>('/provider-locations', { params: { provider_id: providerId, is_active: 'true', limit: 50 } }),
        api.get<any[]>('/provider-schedules', { params: { provider_id: providerId, is_active: 'true', limit: 200 } }),
      ]);
      if (locRes.status === 'fulfilled') setProviderLocations(locRes.value.data || []);
      if (schedRes.status === 'fulfilled') setAvailabilitySchedule(schedRes.value.data || []);
    } catch (err) {
      console.warn('Failed to load availability', err);
    }
  };

  const loadAppointmentStatusPie = async (providerId: string) => {
    const days = appointmentStatsFilter === 'weekly' ? 7 : appointmentStatsFilter === 'monthly' ? 30 : 365;
    const start = new Date();
    start.setDate(start.getDate() - days);
    try {
      const { data } = await api.get<any[]>('/appointments', {
        params: {
          provider_id: providerId,
          appointment_date_gte: start.toISOString().split('T')[0],
          limit: 1000,
        },
      });
      const list = data || [];
      const completed = list.filter((a) => a.status === 'completed').length;
      const scheduled = list.filter((a) => ['scheduled', 'confirmed'].includes(a.status)).length;
      const cancelled = list.filter((a) => ['cancelled', 'no-show'].includes(a.status)).length;
      setAppointmentStatusPie([
        { name: 'Completed', value: completed, color: CHART_COLORS[1] },
        { name: 'Scheduled', value: scheduled, color: CHART_COLORS[2] },
        { name: 'Cancelled', value: cancelled, color: CHART_COLORS[3] },
      ]);
    } catch (err) {
      console.warn('Failed to load appointment status pie', err);
    }
  };

  const loadRecentAppointments = async (providerId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get<any[]>('/appointments', {
        params: {
          provider_id: providerId,
          appointment_date_lte: today,
          order: 'appointment_date:desc',
          include: 'patients,user_profiles',
          limit: 10,
        },
      });
      const list = (data || []).map((apt: any) => ({
        id: apt.id,
        patient_name:
          apt.patient_name ||
          `${apt.first_name || apt.patients?.user_profiles?.first_name || ''} ${apt.last_name || apt.patients?.user_profiles?.last_name || ''}`.trim() ||
          'Patient',
        phone: apt.phone || apt.patients?.user_profiles?.phone || '',
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        appointment_type: apt.appointment_type,
        status: apt.status || 'scheduled',
        consultation_fee_cents: apt.consultation_fee_cents,
      }));
      setRecentAppointments(list);
    } catch (err) {
      console.warn('Failed to load recent appointments', err);
    }
  };

  const buildDailyTrend = (list: any[], days: number): { v: number }[] => {
    const buckets = new Array(days).fill(0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    list.forEach((a: any) => {
      if (!a.appointment_date) return;
      const d = new Date(a.appointment_date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((end.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
    });
    return buckets.map((v) => ({ v }));
  };

  const loadSummaryCards = async (providerId: string) => {
    const days = 7;
    const now = new Date();
    const startCurrent = new Date();
    startCurrent.setDate(now.getDate() - days);
    const startPrev = new Date();
    startPrev.setDate(now.getDate() - days * 2);

    const [currentRes, prevRes, allRes] = await Promise.allSettled([
      api.get<any[]>('/appointments', {
        params: {
          provider_id: providerId,
          appointment_date_gte: startCurrent.toISOString().split('T')[0],
          appointment_date_lte: now.toISOString().split('T')[0],
          limit: 1000,
        },
      }),
      api.get<any[]>('/appointments', {
        params: {
          provider_id: providerId,
          appointment_date_gte: startPrev.toISOString().split('T')[0],
          appointment_date_lte: startCurrent.toISOString().split('T')[0],
          limit: 1000,
        },
      }),
      api.get<any[]>('/appointments', {
        params: { provider_id: providerId, limit: 1000 },
      }),
    ]);

    const curr = currentRes.status === 'fulfilled' ? (currentRes.value.data || []) : [];
    const prev = prevRes.status === 'fulfilled' ? (prevRes.value.data || []) : [];
    const all = allRes.status === 'fulfilled' ? (allRes.value.data || []) : [];

    setTotalAppointmentsCard({
      current: all.length,
      change: pctChange(curr.length, prev.length),
      trend: buildDailyTrend(curr, days),
    });

    const currOnline = curr.filter((a) => a.appointment_type === 'virtual');
    const prevOnline = prev.filter((a) => a.appointment_type === 'virtual');
    const allOnline = all.filter((a) => a.appointment_type === 'virtual');
    setOnlineConsultationsCard({
      current: allOnline.length,
      change: pctChange(currOnline.length, prevOnline.length),
      trend: buildDailyTrend(currOnline, days),
    });

    const currCancelled = curr.filter((a) => ['cancelled', 'no-show'].includes(a.status));
    const prevCancelled = prev.filter((a) => ['cancelled', 'no-show'].includes(a.status));
    const allCancelled = all.filter((a) => ['cancelled', 'no-show'].includes(a.status));
    setCancelledCard({
      current: allCancelled.length,
      change: pctChange(currCancelled.length, prevCancelled.length),
      trend: buildDailyTrend(currCancelled, days),
    });
  };

  const loadTopPatients = async (providerId: string) => {
    const days = topPatientsFilter === 'weekly' ? 7 : topPatientsFilter === 'monthly' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: appointments } = await api.get<any[]>('/appointments', {
      params: {
        provider_id: providerId,
        appointment_date_gte: startDate.toISOString().split('T')[0],
      },
    });

    const patientCounts: { [key: string]: { name: string; phone: string; count: number } } = {};

    appointments?.forEach((apt: any) => {
      const patientId = apt.patient_id;
      if (!patientCounts[patientId]) {
        patientCounts[patientId] = {
          name: apt.patient_name || `${apt.first_name || ''} ${apt.last_name || ''}`.trim() || 'Patient',
          phone: apt.phone || '',
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
            Welcome back{provider.user_profiles?.last_name || provider.last_name ? `, Dr. ${provider.user_profiles?.last_name || provider.last_name}` : ''}
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your practice today</p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => navigate(`/${i18n.language}/dashboard/provider/telemedicine`)}
        >
          <Video size={20} />
          Start Video Session
        </Button>
      </div>

      <CurrentPlanBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
            <Select value={upcomingFilter} onValueChange={(v) => setUpcomingFilter(v as 'today' | 'this-week' | 'this-month')}>
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
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">No upcoming appointments {upcomingFilter === 'today' ? 'today' : upcomingFilter === 'this-week' ? 'this week' : 'this month'}</p>
                </div>
              ) : null}
              {upcomingAppointments.slice(0, 3).map((apt) => (
                <div key={apt.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <UserCog className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{apt.patient_name}</h4>
                      {apt.department && (
                        <p className="text-sm text-muted-foreground">{apt.department}</p>
                      )}
                    </div>
                    {apt.status && (
                      <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'scheduled' ? 'info' : 'secondary'}>
                        {apt.status}
                      </Badge>
                    )}
                  </div>
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
                      <p className="font-medium text-foreground">{apt.department || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{apt.appointment_type === 'virtual' ? 'Online Consultation' : 'In-Person'}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full mb-2"
                    onClick={() => navigate(`/${i18n.language}/dashboard/provider/appointments`)}
                  >
                    Start Appointment
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="bg-black text-white hover:bg-black/90 flex items-center gap-2"
                      onClick={() => navigate(`/${i18n.language}/dashboard/messages`)}
                    >
                      <Mail /> Chat Now
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => navigate(`/${i18n.language}/dashboard/provider/telemedicine`)}
                    >
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
                {recentAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No recent appointments
                    </td>
                  </tr>
                ) : null}
                {recentAppointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <UserCog className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{apt.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{apt.phone || '—'}</p>
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
                      <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'completed' ? 'secondary' : apt.status === 'cancelled' ? 'destructive' : 'info'}>
                        {apt.status || 'Scheduled'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">${apt.consultation_fee_cents ? (apt.consultation_fee_cents / 100).toFixed(0) : '--'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View Details"
                          onClick={() => navigate(`/${i18n.language}/dashboard/provider/appointments`)}
                        >
                          <FileText className="text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Clinical Notes"
                          onClick={() => navigate(`/${i18n.language}/dashboard/provider/clinical-notes`)}
                        >
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
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {providerLocations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.location_name || 'Location'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {(() => {
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const formatTime = (t?: string) => {
                if (!t) return '';
                const [h, m] = t.split(':').map(Number);
                const period = h >= 12 ? 'PM' : 'AM';
                const hr = h % 12 || 12;
                return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
              };
              const filteredSchedules = availabilitySchedule.filter((s: any) =>
                availabilityFilter === 'all' || s.location_id === availabilityFilter
              );
              const byDay: Record<number, any[]> = {};
              filteredSchedules.forEach((s: any) => {
                const d = s.day_of_week;
                if (!byDay[d]) byDay[d] = [];
                byDay[d].push(s);
              });
              const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
              if (days.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">No availability configured{availabilityFilter === 'all' ? '' : ' for this location'}</p>
                    <Button
                      variant="link"
                      onClick={() => navigate(`/${i18n.language}/dashboard/provider/schedule`)}
                      className="mt-2"
                    >
                      Set schedule
                    </Button>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {days.map((d) => {
                    const slots = byDay[d];
                    return (
                      <div key={d} className="flex items-start justify-between py-2 border-b border-border">
                        <span className="font-medium text-foreground">{dayNames[d]}</span>
                        <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                          {slots.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-2">
                              <Clock className="text-muted-foreground w-3.5 h-3.5" />
                              <span>{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
            {appointmentStatusPie.reduce((sum, s) => sum + s.value, 0) === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-center">
                <p className="text-muted-foreground text-sm">No appointment data for this period</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={appointmentStatusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {appointmentStatusPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  {appointmentStatusPie.map((s) => (
                    <div key={s.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                      <span>{s.name}: {s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
        {[
          { title: 'Total Appointments', data: totalAppointmentsCard, color: CHART_COLORS[0] },
          { title: 'Online Consultations', data: onlineConsultationsCard, color: CHART_COLORS[2] },
          { title: 'Cancelled Appointments', data: cancelledCard, color: CHART_COLORS[4] },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-bold text-foreground">{card.data.current}</div>
                {card.data.current > 0 && (
                  <Badge variant={card.data.change >= 0 ? 'success' : 'destructive'}>
                    {card.data.change >= 0 ? '+' : ''}{card.data.change}%
                  </Badge>
                )}
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={card.data.trend.length > 0 ? card.data.trend : [{ v: 0 }]}>
                  <Bar dataKey="v" fill={card.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-2">
                {card.data.change >= 0 ? '+' : ''}{card.data.change}% {card.data.change >= 0 ? '↑' : '↓'} in last 7 Days
              </p>
            </CardContent>
          </Card>
        ))}
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
                to={`/${i18n.language}/dashboard/provider/appointments/create`}
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <CalendarDays className="text-2xl text-blue-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">New Appointment</span>
              </Link>

              <Link
                to={`/${i18n.language}/dashboard/provider/prescriptions/create`}
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Pill className="text-2xl text-green-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Write Prescription</span>
              </Link>

              <Link
                to={`/${i18n.language}/dashboard/messages`}
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
                to={`/${i18n.language}/dashboard/patient/medical-records`}
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <FileHeart className="text-2xl text-blue-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Patient Records</span>
              </Link>

              <Link
                to={`/${i18n.language}/dashboard/provider/insurance`}
                className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
              >
                <Receipt className="text-2xl text-cyan-600 mb-2" />
                <span className="text-xs font-medium text-foreground text-center">Submit Claim</span>
              </Link>

              <Link
                to={`/${i18n.language}/dashboard/provider/reports`}
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
