import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { patientService } from '../../../../services/patientService';
import { appointmentService } from '../../../../services/appointmentService';
import { prescriptionService } from '../../../../services/prescriptionService';
import { healthAnalyticsService, HealthScore, CareRecommendation } from '../../../../services/healthAnalyticsService';
import { fhirService } from '../../../../services/fhirService';
import { notificationService } from '../../../../services/notificationService';
import ProfileCompletionWizard from '../../../../components/auth/ProfileCompletionWizard';
import HealthRecordsViewer from '../../../../components/health/HealthRecordsViewer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import {
  Calendar,
  Pill,
  FileText,
  Video,
  Mail,
  Clock,
  ChevronRight,
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Heart,
  Store,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [activePrescriptions, setActivePrescriptions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [healthSummary, setHealthSummary] = useState({
    lastCheckup: null as string | null,
    activeMedications: 0,
    pendingRefills: 0,
    allergies: [] as string[],
  });
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [careRecommendations, setCareRecommendations] = useState<CareRecommendation[]>([]);
  const [showHealthRecords, setShowHealthRecords] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const patientData = await patientService.getPatientByUserId(user.id);

      if (!patientData || !patientData.profile_completed) {
        setShowProfileWizard(true);
        setLoading(false);
        return;
      }

      setPatient(patientData);

      const [appointments, prescriptions, score, recommendations, allergies] = await Promise.all([
        appointmentService.getPatientAppointments(patientData.id),
        prescriptionService.getPatientPrescriptions(patientData.id),
        healthAnalyticsService.calculateHealthScore(patientData.id),
        healthAnalyticsService.generateCareRecommendations(patientData.id),
        patientService.getAllergies(patientData.id),
      ]);

      setHealthScore(score);
      setCareRecommendations(recommendations);

      const upcoming = appointments
        .filter((apt) => apt.status === 'scheduled' || apt.status === 'confirmed')
        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
        .slice(0, 3);

      setUpcomingAppointments(upcoming);
      setActivePrescriptions(prescriptions.slice(0, 3));

      setHealthSummary({
        lastCheckup: appointments.length > 0 ? appointments[0].appointment_date : null,
        activeMedications: prescriptions.length,
        pendingRefills: prescriptions.filter((p) => (p as any).refills_remaining === 0).length,
        allergies: allergies.map((a: any) => a.allergen),
      });

      try {
        const { data: notifs } = await notificationService.getNotifications(user.id);
        setUnreadCount((notifs || []).filter((n: any) => !n.read_at).length);
      } catch {
        setUnreadCount(0);
      }

      const activityItems: any[] = [];
      if (upcoming.length > 0) {
        const apt = upcoming[0];
        activityItems.push({
          type: 'appointment',
          text: `Upcoming appointment with Dr. ${(apt as any).providers?.user_profiles?.last_name || 'Provider'}`,
          time: new Date(apt.appointment_date).toLocaleDateString(),
        });
      }
      if (prescriptions.length > 0) {
        activityItems.push({
          type: 'prescription',
          text: `${prescriptions.length} active prescription${prescriptions.length > 1 ? 's' : ''}`,
          time: 'Current',
        });
      }
      if (allergies.length > 0) {
        activityItems.push({
          type: 'alert',
          text: `${allergies.length} known allerg${allergies.length > 1 ? 'ies' : 'y'} on file`,
          time: 'Health Alert',
        });
      }
      setRecentActivity(activityItems);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    if (patient) {
      await fhirService.syncFHIRData(patient.id);
    }
    setRefreshing(false);
  };

  const getCountdownText = (appointmentDate: string, startTime: string) => {
    const now = new Date();
    const appointment = new Date(`${appointmentDate}T${startTime}`);
    const diffMs = appointment.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMs > 0) return 'Today';
    return 'Past';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-emerald-50';
    if (score >= 60) return 'bg-amber-50';
    return 'bg-red-50';
  };

  const quickActions = [
    {
      icon: <Calendar className="w-5 h-5 text-white" />,
      label: 'Book Appointment',
      href: '/dashboard/patient/appointments/book',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: <Video className="w-5 h-5 text-white" />,
      label: 'Video Call',
      href: '/dashboard/patient/video-consultation',
      gradient: 'from-teal-500 to-teal-600',
    },
    {
      icon: <Mail className="w-5 h-5 text-white" />,
      label: 'Messages',
      href: '/dashboard/patient/messages',
      gradient: 'from-green-500 to-green-600',
    },
    {
      icon: <Store className="w-5 h-5 text-white" />,
      label: 'Pharmacy',
      href: '/dashboard/patient/pharmacy-marketplace',
      gradient: 'from-orange-500 to-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showProfileWizard) {
    return (
      <ProfileCompletionWizard
        onComplete={() => {
          setShowProfileWizard(false);
          loadDashboardData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome back, {patient?.first_name || userProfile?.first_name || user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="text-blue-100 mt-2">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => navigate('/dashboard/notifications')}
                className="relative p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className={`flex flex-col items-center justify-center p-4 bg-gradient-to-br ${action.gradient} rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
              >
                <div className="mb-2">{action.icon}</div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Health Summary</CardTitle>
              <Link to="/dashboard/patient/health-records" className="text-blue-600 text-sm font-medium hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Checkup</p>
                      <p className="text-sm font-bold text-foreground">
                        {healthSummary.lastCheckup
                          ? new Date(healthSummary.lastCheckup).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Pill className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active Meds</p>
                      <p className="text-sm font-bold text-foreground">{healthSummary.activeMedications}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Pill className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refills Due</p>
                      <p className="text-sm font-bold text-foreground">{healthSummary.pendingRefills}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sky-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-sky-100 p-2 rounded-lg">
                      <Mail className="w-4 h-4 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Notifications</p>
                      <p className="text-sm font-bold text-foreground">{unreadCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {healthSummary.allergies.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-1">Known Allergies</p>
                      <p className="text-sm text-red-700">{healthSummary.allergies.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {healthScore && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-center p-6 rounded-xl ${getScoreBackground(healthScore.overall_score)}`}>
                  <div className={`text-5xl font-bold ${getScoreColor(healthScore.overall_score)} mb-2`}>
                    {healthScore.overall_score}
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Health Score</p>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Appointments', score: healthScore.appointment_adherence_score, color: 'bg-blue-600' },
                    { label: 'Medications', score: healthScore.medication_compliance_score, color: 'bg-green-600' },
                    { label: 'Lab Results', score: healthScore.lab_results_score, color: 'bg-teal-600' },
                    { label: 'Vitals', score: healthScore.vital_signs_score, color: 'bg-orange-600' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold">{item.score}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <Link to="/dashboard/patient/appointments" className="text-blue-600 text-sm font-medium hover:underline">
              View All
            </Link>
          </CardHeader>

          {upcomingAppointments.length === 0 ? (
            <CardContent className="p-12 text-center">
              <Calendar className="mx-auto w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">No upcoming appointments</p>
              <Link
                to="/dashboard/patient/appointments/book"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Book Your First Appointment
              </Link>
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4 hover:bg-muted transition">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {new Date(appointment.appointment_date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {new Date(appointment.appointment_date).getDate()}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        Dr. {(appointment as any).providers?.user_profiles?.last_name || 'Provider'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.start_time} - {appointment.appointment_type}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">
                          {getCountdownText(appointment.appointment_date, appointment.start_time)}
                        </span>
                      </div>
                      {appointment.reason_for_visit && (
                        <p className="text-xs text-muted-foreground mt-1">{appointment.reason_for_visit}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {appointment.appointment_type === 'virtual' || appointment.visit_type === 'virtual' ? (
                        <button
                          onClick={() => navigate(`/dashboard/video-call/${appointment.id}`)}
                          className="p-2 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition-colors"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      ) : (
                        <Link to="/dashboard/patient/appointments">
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <CardTitle className="text-lg">Active Prescriptions</CardTitle>
              <Link to="/dashboard/patient/prescriptions" className="text-blue-600 text-sm font-medium hover:underline">
                View All
              </Link>
            </CardHeader>

            {activePrescriptions.length === 0 ? (
              <CardContent className="p-12 text-center">
                <Pill className="mx-auto w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No active prescriptions</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {activePrescriptions.map((prescription) => (
                  <div key={prescription.id} className="p-4 hover:bg-muted transition">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Pill className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{prescription.medication_name}</p>
                        <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {prescription.refills_remaining} refills remaining
                        </p>
                      </div>
                      {prescription.refills_remaining === 0 && (
                        <button
                          onClick={() => navigate('/dashboard/patient/pharmacy/refills')}
                          className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
                        >
                          Refill
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>

            {recentActivity.length === 0 ? (
              <CardContent className="p-12 text-center">
                <Activity className="mx-auto w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No recent activity</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-muted transition">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          activity.type === 'appointment'
                            ? 'bg-blue-100'
                            : activity.type === 'prescription'
                            ? 'bg-green-100'
                            : 'bg-red-100'
                        }`}
                      >
                        {activity.type === 'appointment' ? (
                          <Calendar className="w-4 h-4 text-blue-600" />
                        ) : activity.type === 'prescription' ? (
                          <Pill className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {careRecommendations.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Care Recommendations</CardTitle>
            </CardHeader>

            <div className="divide-y divide-border">
              {careRecommendations.slice(0, 3).map((recommendation) => (
                <div key={recommendation.id} className="p-4 hover:bg-muted transition">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        recommendation.priority === 'high'
                          ? 'bg-red-100'
                          : recommendation.priority === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {recommendation.priority === 'high' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{recommendation.title}</h3>
                        <Badge
                          variant={
                            recommendation.priority === 'high'
                              ? 'destructive'
                              : recommendation.priority === 'medium'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{recommendation.description}</p>
                      <p className="text-xs font-medium text-blue-600">{recommendation.action_required}</p>
                      {recommendation.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due by: {new Date(recommendation.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {patient && (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <CardTitle className="text-lg">Health Records</CardTitle>
              <button
                onClick={() => setShowHealthRecords(!showHealthRecords)}
                className="text-blue-600 text-sm font-medium hover:underline"
              >
                {showHealthRecords ? 'Hide' : 'Show Records'}
              </button>
            </CardHeader>

            {showHealthRecords && (
              <CardContent className="pt-6">
                <HealthRecordsViewer patientId={patient.id} />
              </CardContent>
            )}
          </Card>
        )}

        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Need to order medications?</h3>
              <p className="text-teal-50 mb-4">Browse our pharmacy marketplace for fast delivery</p>
              <Link
                to="/dashboard/patient/pharmacy-marketplace"
                className="inline-flex items-center px-6 py-3 bg-white text-teal-600 font-semibold rounded-lg hover:bg-teal-50 transition"
              >
                <Store className="w-5 h-5 mr-2" />
                Visit Pharmacy
              </Link>
            </div>
            <Store className="w-20 h-20 text-teal-400 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
